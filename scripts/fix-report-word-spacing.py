import os
import re
import shutil
import sys
import unicodedata
import zipfile
from collections import defaultdict
import lxml.etree as ET
import pymupdf
import win32com.client

sys.stdout.reconfigure(encoding="utf-8")

W_URI = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_URI}}}"

AFTER_JC_TAGS = {
    f"{W}textDirection",
    f"{W}textAlignment",
    f"{W}textboxTightWrap",
    f"{W}outlineLvl",
    f"{W}divId",
    f"{W}cnfStyle",
    f"{W}rPr",
    f"{W}sectPr",
    f"{W}pPrChange",
}


def nfc(s):
    return unicodedata.normalize("NFC", s)


def set_p_jc(p, val):
    pPr = p.find(f"{W}pPr")
    if pPr is None:
        pPr = ET.Element(f"{W}pPr")
        p.insert(0, pPr)
    jc = pPr.find(f"{W}jc")
    if jc is None:
        jc = ET.Element(f"{W}jc")
        inserted = False
        for i, child in enumerate(pPr):
            if child.tag in AFTER_JC_TAGS:
                pPr.insert(i, jc)
                inserted = True
                break
        if not inserted:
            pPr.append(jc)
    jc.set(f"{W}val", val)


def replace_in_paragraph_runs(p, replacements):
    t_nodes = list(p.iter(f"{W}t"))
    if not t_nodes:
        return False
    full = "".join(t.text or "" for t in t_nodes)
    new_full = full
    for old, new in replacements:
        if old in new_full:
            new_full = new_full.replace(old, new)
    if new_full == full:
        return False

    if len(t_nodes) == 1:
        t_nodes[0].text = new_full
        if new_full.startswith(" ") or new_full.endswith(" "):
            t_nodes[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        return True

    test_nodes = [t.text or "" for t in t_nodes]
    for i, txt in enumerate(test_nodes):
        nt = txt
        for old, new in replacements:
            if old in nt:
                nt = nt.replace(old, new)
        test_nodes[i] = nt
    if "".join(test_nodes) == new_full:
        for t, nt in zip(t_nodes, test_nodes):
            t.text = nt
            if nt.startswith(" ") or nt.endswith(" "):
                t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        return True

    if any(p.iter(f"{W}tab")):
        return False

    runs = list(p.findall(f"{W}r"))
    bold_states = []
    for r in runs:
        rPr = r.find(f"{W}rPr")
        has_b = rPr is not None and rPr.find(f"{W}b") is not None
        bold_states.append(has_b)

    if len(set(bold_states)) <= 1:
        t_nodes[0].text = new_full
        t_nodes[0].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        for t in t_nodes[1:]:
            t.text = ""
        return True

    prefix = t_nodes[0].text or ""
    if new_full.startswith(prefix):
        t_nodes[1].text = new_full[len(prefix):]
        t_nodes[1].set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        for t in t_nodes[2:]:
            t.text = ""
        return True
    return False


GLOBAL_REPLACEMENTS = [
    # 1. Leading-dot file extension lists (UAX #14 kinsoku glue in 2.png)
    ("tệp .DXF, .STL, .OBJ, .SCR, .SCAD và .SVG", "tệp DXF, STL, OBJ, SCR, SCAD và SVG"),
    ("(.DXF, .STL, .OBJ, .SCR, .SCAD, .SVG)", "(DXF, STL, OBJ, SCR, SCAD, SVG)"),
    ("(xuất trực tiếp .DXF, .STL, .OBJ, .SVG)", "(xuất trực tiếp tệp DXF, STL, OBJ, SVG)"),
    ("(.DXF, .STL, .OBJ)", "(DXF, STL, OBJ)"),
    ("DXF/STL/OBJ/SVG", "DXF, STL, OBJ, SVG"),
    ("(.PDF, .DOCX, .MD, .SQL, .CPP)", "(PDF, DOCX, MD, SQL, CPP)"),

    # 2. Unbroken 34-55 char XML tags in Section 1.3.4
    (
        "ngữ cảnh bài tập được bao bọc trong cặp thẻ <nguon_bai_tap>...</nguon_bai_tap> và toàn bộ hồ sơ học tập - bộ nhớ sinh viên được đóng gói trong cặp thẻ <ho_so_hoc_tap_sinh_vien>...</ho_so_hoc_tap_sinh_vien>. Đi kèm với đó là các quy tắc neo ngữ cảnh (Grounding Constraints) yêu cầu mô hình kiểm chứng từng con số từ thẻ XML trước khi xuất câu trả lời, đồng thời tự động phát sinh thẻ <ghi_nho_sinh_vien code=\"MÃ_SV\" category=\"...\">...</ghi_nho_sinh_vien> ở cuối phản hồi khi phát hiện thông tin mới cần lưu vào bộ nhớ dài hạn.",
        "ngữ cảnh bài tập được bao bọc trong cặp thẻ định danh nguồn bài tập và toàn bộ hồ sơ học tập - bộ nhớ sinh viên được đóng gói riêng trong cặp thẻ hồ sơ sinh viên xác thực. Đi kèm với đó là bộ quy tắc neo ngữ cảnh yêu cầu mô hình kiểm chứng từng con số từ khối dữ liệu nguồn trước khi xuất câu trả lời, đồng thời tự động sinh thẻ ghi nhớ sinh viên (gồm mã sinh viên và phân loại thông tin) ở cuối phản hồi khi phát hiện dữ kiện mới cần lưu dài hạn.",
    ),

    # 3. Slash-joined lists without spaces
    ("C++/Java/Python/TypeScript", "C++, Java, Python, TypeScript"),
    ("C/C++/C#/Java/Python", "C, C++, C#, Java, Python"),
    ("C++/Java/SQL/Python", "C++, Java, SQL, Python"),
    ("C++/Java/Python/TS", "C++, Java, Python, TypeScript"),
    ("C++/Java/SQL", "C++, Java, SQL"),
    ("PDF/DOCX/CSV/Code/Ảnh", "PDF, DOCX, CSV, mã nguồn, ảnh"),
    ("OpenAI/Anthropic", "OpenAI hoặc Anthropic"),
    ("ChatGPT/Gemini", "ChatGPT, Gemini"),
    ("Moodle/Classroom", "Moodle, Classroom"),
    ("iOS/Android", "iOS và Android"),
    ("WebGL/Canvas", "WebGL và Canvas"),
    ("RSS/Facebook", "RSS, Facebook"),
    ("lớp/Đoàn/CLB", "lớp, Đoàn, CLB"),
    ("user/assistant", "user và assistant"),

    # 4. All long unbreakable identifiers / paths / tags in justified prose (4-DoanVB & 2-Tru)
    (
        "Chính vì vậy, việc thực hiện đề tài “Nghiên cứu và xây dựng trợ lý học tập thông minh ứng dụng Generative AI (Artificial Intelligence) và Retrieval-Augmented Generation hỗ trợ sinh viên đại học” mang tính cấp thiết cao",
        "Chính vì vậy, việc triển khai thực hiện đề tài “Nghiên cứu và xây dựng trợ lý học tập thông minh ứng dụng Generative AI (Artificial Intelligence) và Retrieval-Augmented Generation hỗ trợ sinh viên đại học” mang tính cấp thiết cao",
    ),
    (
        "Module đồng thời hỗ trợ tự động trích xuất thẻ ghi nhớ mới (<ghi_nho_sinh_vien>) vào cơ sở dữ liệu và sinh mã đặc tả để vẽ biểu đồ tương tác, bản vẽ kỹ thuật CAD 2D/3D.",
        "Module đồng thời hỗ trợ tự động trích xuất thẻ ghi nhớ sinh viên mới lưu vào cơ sở dữ liệu và sinh mã đặc tả để vẽ biểu đồ tương tác, bản vẽ kỹ thuật CAD 2D/3D.",
    ),
    (
        "thông qua cặp thủ tục lưu trữ public.ai_reserve và public.ai_finish sử dụng pg_advisory_xact_lock để chống gửi trùng yêu cầu (Idempotency), ngăn chặn điều kiện tranh chấp (Race Condition) và kiểm soát chặt chẽ hạn mức suy luận AI hàng ngày.",
        "thông qua cặp thủ tục lưu trữ ai_reserve và ai_finish kết hợp khóa tư vấn mức giao dịch của PostgreSQL để chống gửi trùng yêu cầu, ngăn chặn tranh chấp dữ liệu đồng thời và kiểm soát chặt chẽ hạn mức suy luận AI hàng ngày.",
    ),
    (
        "và được tuần tự hóa bằng khóa tư vấn giao dịch pg_advisory_xact_lock trên PostgreSQL, đảm bảo không xảy ra xung đột",
        "và được tuần tự hóa bằng cơ chế khóa tư vấn mức giao dịch trực tiếp trên PostgreSQL, đảm bảo không xảy ra xung đột",
    ),
    (
        "(2) phân vùng hồ sơ sinh viên và lớp học phần (student_records, teacher_class_roster, classes, class_members, teacher_subject_classes, teacher_attendance_sessions); (3) phân vùng bài tập, bài nộp và cộng đồng (assignments, submissions, portal_custom_assignments, portal_submissions, community_profiles, community_rooms, community_members, community_messages, news_sources, news_posts); và (4) phân vùng trợ lý học tập AI, kho vector và bộ nhớ sinh viên (ai_conversations, ai_messages, private.ai_limits, academic_knowledge_chunks, portal_kv_store).",
        "(2) phân vùng hồ sơ sinh viên, lớp học phần và điểm danh (bảng hồ sơ sinh viên, lớp học phần, thành viên lớp cùng nhóm bảng phân công giảng dạy và phiên điểm danh); (3) phân vùng bài tập, bài nộp, tin tức và cộng đồng học thuật (bảng bài tập, bài nộp cùng nhóm bảng phòng trao đổi cộng đồng và bản tin khoa); và (4) phân vùng trợ lý học tập AI, kho vector ngữ nghĩa và bộ nhớ dài hạn của sinh viên (bảng hội thoại AI, tin nhắn AI, hạn mức suy luận, kho vector học liệu và kho trạng thái cá nhân hóa).",
    ),
    (
        "điểm số (font-variant-numeric: tabular-nums) và các khối mã nguồn.",
        "điểm số (căn thẳng hàng chữ số dạng bảng) và các khối mã nguồn.",
    ),
    (
        "giúp chia sẻ đồng nhất các hợp đồng kiểu dữ liệu (@sao-do/contracts) và thư viện kết nối API (@sao-do/api-client) giữa ứng dụng Web cổng thông tin và ứng dụng di động.",
        "giúp chia sẻ đồng nhất gói hợp đồng kiểu dữ liệu dùng chung và gói thư viện kết nối API giữa ứng dụng Web cổng thông tin và ứng dụng di động.",
    ),
    (
        "Khác với các công cụ hỏi đáp AI thông thường bị mất ngữ cảnh cá nhân khi mở cuộc trò chuyện mới, phân hệ student-memory.ts kết hợp với sdu-student-2200286.ts thiết lập một động cơ bộ nhớ sinh viên dài hạn (SDU Student Memory Engine). Khi sinh viên Nguyễn Văn Đạt (MSV: 2200286) gửi truy vấn, hàm buildStudentMemoryContext() tự động đóng gói toàn bộ hồ sơ cá nhân, tiến độ 143/163 tín chỉ đã tích lũy (GPA tích lũy 3,08/4,0; GPA học kỳ 8 đạt 3,74/4,0), bảng điểm chi tiết 48 môn học qua 9 học kỳ, thời khóa biểu tuần, lịch thi và trạng thái học phí vào khối thẻ <ho_so_hoc_tap_sinh_vien>. Đồng thời, mỗi khi sinh viên chia sẻ mục tiêu mới trong lúc trò chuyện, hàm extractAndSaveMemoriesFromResponse() tự động bóc tách thẻ ẩn <ghi_nho_sinh_vien> từ phản hồi của Model SDU 1.3 để cập nhật bền vững lên đám mây Supabase.",
        "Khác với các công cụ hỏi đáp AI thông thường bị mất ngữ cảnh cá nhân khi mở cuộc trò chuyện mới, phân hệ quản lý bộ nhớ sinh viên kết hợp kho hồ sơ học vụ thiết lập một động cơ bộ nhớ dài hạn (SDU Student Memory Engine). Khi sinh viên Nguyễn Văn Đạt (MSV: 2200286) gửi truy vấn, bộ tổng hợp ngữ cảnh tự động đóng gói toàn bộ hồ sơ cá nhân, tiến độ 143/163 tín chỉ đã tích lũy (GPA tích lũy 3,08/4,0; GPA học kỳ 8 đạt 3,74/4,0), bảng điểm chi tiết 48 môn học qua 9 học kỳ, thời khóa biểu tuần, lịch thi và trạng thái học phí vào khối thẻ hồ sơ học tập xác thực. Đồng thời, mỗi khi sinh viên chia sẻ mục tiêu mới trong lúc trò chuyện, bộ trích xuất ghi nhớ tự động bóc tách thẻ ghi nhớ ẩn từ phản hồi của Model SDU 1.3 để cập nhật bền vững lên đám mây Supabase.",
    ),
    (
        "thực thi định tuyến nghiêm ngặt qua hàm safeReturnPath(next, role) tại LoginForm.tsx: tài khoản có vai trò student được chuyển thẳng vào /student; tài khoản giảng viên (ductm@saodo.edu.vn) được điều hướng vào không gian quản lý giảng dạy; và tài khoản quản trị viên (staff) được điều hướng vào /quan-tri. Mọi tài khoản mới khởi tạo có cờ must_change_password = true đều bị cưỡng chế chuyển hướng sang trang /doi-mat-khau trước khi được phép truy cập dữ liệu học vụ.",
        "thực thi định tuyến nghiêm ngặt ngay tại biểu mẫu đăng nhập theo đúng vai trò xác thực: tài khoản vai trò sinh viên được chuyển thẳng tới cổng học tập cá nhân; tài khoản của giảng viên phụ trách môn học được điều hướng riêng vào cổng quản lý giảng dạy; và tài khoản quản trị viên được dẫn tới phân hệ quản trị. Mọi tài khoản mới khởi tạo mang cờ yêu cầu đổi mật khẩu lần đầu đều được chuyển hướng sang trang cập nhật mật khẩu trước khi truy cập dữ liệu học vụ.",
    ),
    (
        "Khi người dùng nhập mã sinh viên (2200286), hàm kiểm tra định danh evaluateIdentityInput() tự động nhận diện chuỗi 7 chữ số, ánh xạ tức thời sang địa chỉ 2200286@sv.saodo.edu.vn kèm huy hiệu xác nhận màu xanh trên biểu mẫu.",
        "Khi người dùng nhập mã sinh viên (2200286), bộ kiểm tra định danh trên biểu mẫu đăng nhập tự động nhận diện chuỗi 7 chữ số, ghép miền thư điện tử sinh viên của nhà trường và hiển thị tức thời huy hiệu xác nhận màu xanh.",
    ),
    (
        "kết hợp chạy tự động bộ kiểm thử bảo mật pgTAP (supabase/tests/rls_smoke.sql) và kiểm thử tích hợp API. Kết quả kiểm thử tại Bảng 3.6 khẳng định khóa tư vấn giao dịch pg_advisory_xact_lock trong hàm public.ai_reserve() đã chặn đứng 100% yêu cầu gửi trùng mạng",
        "kết hợp chạy tự động bộ kiểm thử bảo mật pgTAP gồm 88 mệnh đề kiểm chứng và kiểm thử tích hợp API. Kết quả kiểm thử tại Bảng 3.6 khẳng định cơ chế khóa tư vấn giao dịch nguyên tử trong thủ tục ai_reserve() đã chặn đứng 100% yêu cầu gửi trùng mạng",
    ),
    (
        "Cài đặt cơ chế đặt chỗ hạn mức nguyên tử 2 pha (public.ai_reserve và public.ai_finish) sử dụng khóa tư vấn giao dịch pg_advisory_xact_lock kết hợp Idempotency-Key,",
        "Cài đặt cơ chế đặt chỗ hạn mức nguyên tử 2 pha (thủ tục ai_reserve và ai_finish) sử dụng khóa tư vấn mức giao dịch kết hợp khóa chống trùng Idempotency-Key,",
    ),

    # 5. Eliminate 1-word orphan tails & sync modified table captions cleanly
    (
        "vào giải quyết một bài toán công nghệ thực tiễn.",
        "vào giải quyết bài toán công nghệ thực tiễn.",
    ),
    (
        "triển khai xây dựng, thực nghiệm và đánh giá hệ thống trong Chương 3.",
        "triển khai xây dựng và thực nghiệm đánh giá hệ thống tại Chương 3.",
    ),
    (
        "Tại tầng điều phối máy chủ (apps/web/src/app/api/ai/chat/route.ts), luồng tiếp nhận truy vấn ngôn ngữ tự nhiên và tổng hợp câu trả lời được cài đặt chặt chẽ qua 4 cơ chế kỹ thuật:",
        "Tại tầng điều phối máy chủ của tuyến giao tiếp /api/ai/chat, luồng tiếp nhận truy vấn ngôn ngữ tự nhiên và tổng hợp câu trả lời được cài đặt qua 4 cơ chế kỹ thuật:",
    ),
    (
        "Bảng 1.6. Bộ tiêu chuẩn và chỉ số định lượng đánh giá hệ thống trợ lý học tập thông minh",
        "Bảng 1.6. Bộ tiêu chuẩn định lượng đánh giá hệ thống trợ lý học tập thông minh",
    ),
    (
        "Bảng 2.1. Tổng hợp các tác nhân (Actors) và phân quyền chức năng trong hệ thống SDU",
        "Bảng 2.1. Tổng hợp các tác nhân và phân quyền chức năng trong hệ thống SDU",
    ),
    (
        "Bảng 3.3. Thống kê kho ngữ liệu học thuật đầu vào đã nhúng và đồng bộ trên hệ thống SDU",
        "Bảng 3.3. Thống kê kho ngữ liệu học thuật đã nhúng và đồng bộ trên hệ thống",
    ),
    (
        "Bảng 3.5. Kết quả thực nghiệm tốc độ truy xuất RAG, độ trễ TTFT và thông lượng sinh văn bản",
        "Bảng 3.5. Kết quả thực nghiệm tốc độ truy xuất RAG, độ trễ TTFT và thông lượng",
    ),
    (
        "Tuyến API gọi thủ tục public.ai_reserve() để thực thi khóa tư vấn giao dịch pg_advisory_xact_lock, kiểm tra hạn mức 30 lượt/ngày theo múi giờ Asia/Ho_Chi_Minh và tạo cặp bản ghi user và assistant nguyên tử.",
        "Tuyến API gọi thủ tục lưu trữ ai_reserve() để kích hoạt khóa tư vấn giao dịch mức cơ sở dữ liệu, kiểm tra hạn mức 30 lượt mỗi ngày theo giờ Việt Nam và khởi tạo cặp bản ghi hội thoại nguyên tử.",
    ),
    (
        "Đóng gói Grounded System Prompt theo 4 chế độ sư phạm: Hàm systemPromptFor(mode) kết hợp chỉ thị sư phạm (Explain, Summarize, Practice, Plan) với ngữ cảnh bài tập (<bai_tap>), hồ sơ 163 tín chỉ (<ho_so_hoc_tap_sinh_vien>) và tệp học liệu đính kèm (toAttachmentBlocks hỗ trợ PDF, DOCX, CSV, mã nguồn và hình ảnh).",
        "Đóng gói chỉ thị hệ thống theo 4 chế độ sư phạm: Bộ tạo ngữ cảnh kết hợp chặt chẽ chỉ thị sư phạm (Explain, Summarize, Practice, Plan) cùng đề bài tập đang chọn, hồ sơ học vụ 163 tín chỉ đã xác thực, kho học liệu môn học và nội dung các tệp đính kèm đa định dạng (PDF, DOCX, CSV, mã nguồn và hình ảnh).",
    ),
    (
        "Nghiên cứu kiến trúc sinh văn bản tăng cường khả năng truy xuất (Retrieval-Augmented Generation - RAG) nhằm giảm thiểu hiện tượng ảo giác thông tin (hallucination): Phân tích nguyên nhân gây ra hiện tượng ảo giác thông tin ở các mô hình LLM thuần túy khi truy vấn tri thức chuyên biệt; từ đó nghiên cứu kiến trúc RAG kết hợp truy xuất ngữ nghĩa và truy xuất cấu trúc (Hybrid và Multi-Source RAG), cơ chế đóng gói ngữ cảnh có kiểm soát bằng thẻ ngữ nghĩa XML (<nguon_bai_tap>, <ho_so_hoc_tap_sinh_vien>) và ràng buộc chỉ thị hệ thống (Grounded System Prompting) buộc mô hình bám sát dữ liệu xác thực của nhà trường.",
        "Nghiên cứu kiến trúc sinh văn bản tăng cường truy xuất (RAG) nhằm giảm thiểu hiện tượng ảo giác thông tin: Phân tích nguyên nhân gây ra ảo giác ở các mô hình ngôn ngữ thuần túy khi truy vấn tri thức chuyên biệt; từ đó thiết kế kiến trúc RAG đa nguồn kết hợp truy xuất ngữ nghĩa với dữ liệu học vụ có cấu trúc, đóng gói ngữ cảnh bằng các thẻ định danh có kiểm soát và thiết lập ràng buộc chỉ thị hệ thống buộc mô hình bám sát dữ liệu xác thực của nhà trường.",
    ),
    (
        "trợ lý học tập thông minh ứng dụng Generative AI (Artificial Intelligence) và Retrieval-Augmented Generation (RAG)",
        "trợ lý học tập thông minh ứng dụng trí tuệ nhân tạo tạo sinh (Generative AI) kết hợp kiến trúc sinh văn bản tăng cường truy xuất (RAG)",
    ),
    (
        "Trái tim của mọi mô hình ngôn ngữ lớn hiện đại là kiến trúc Decoder-only Transformer.",
        "Nền tảng cốt lõi của các mô hình ngôn ngữ lớn hiện đại là kiến trúc mạng Transformer chỉ giải mã (Decoder-only).",
    ),
    (
        "cả phép tìm kiếm tương đồng vector (ORDER BY embedding <=> query_embedding LIMIT K) lẫn phép kết nối (JOIN)",
        "cả phép tìm kiếm lân cận tương đồng vector (sắp xếp theo khoảng cách embedding <=> v_q giới hạn K kết quả) lẫn phép kết nối (JOIN)",
    ),
    (
        "cùng nội dung chi tiết của bài tập lớp học phần (assignments.title, assignments.instructions) từ cơ sở dữ liệu.",
        "cùng tiêu đề và nội dung yêu cầu chi tiết của từng bài tập lớp học phần truy xuất trực tiếp từ cơ sở dữ liệu.",
    ),
    (
        "Nguồn 4 - ngữ cảnh tệp đính kèm đa phương thức tức thời (In-Session Multimodal Attachment Context): Nội dung văn bản, bảng số liệu hoặc hình ảnh mà sinh viên đính kèm trực tiếp trong lượt hỏi hiện tại.",
        "Nguồn 4 - ngữ cảnh tệp đính kèm đa phương thức trong phiên hỏi đáp: Nội dung văn bản, bảng số liệu, mã nguồn hoặc hình ảnh mà sinh viên tải lên trực tiếp trong lượt trao đổi hiện tại.",
    ),
    (
        "Mô tả chi tiết cơ chế kiểm tra khóa chống trùng Idempotency-Key, khóa tư vấn giao dịch pg_advisory_xact_lock và hạn mức 30 lượt/ngày trong hàm public.ai_reserve(), trước khi thực hiện tìm kiếm tương đồng ngữ nghĩa HNSW trên kho vector pgvector, truyền phát dòng sự kiện SSE từ Model SDU 1.3 và tự động trích xuất thẻ <ghi_nho_sinh_vien> lưu vào bộ nhớ dài hạn.",
        "Mô tả chi tiết cơ chế kiểm tra khóa chống gửi trùng (Idempotency-Key), khóa tư vấn giao dịch nguyên tử và hạn mức 30 lượt mỗi ngày trong thủ tục ai_reserve(), trước khi truy vấn tương đồng ngữ nghĩa HNSW trên kho vector pgvector, truyền phát dòng sự kiện SSE từ Model SDU 1.3 và tự động cập nhật bộ nhớ sinh viên dài hạn.",
    ),
    (
        "Tầng 1 - giao diện người dùng đa nền tảng (Multi-Platform Presentation Layer):",
        "Tầng 1 - giao diện người dùng đa nền tảng trên Web và thiết bị di động:",
    ),
    (
        "Yêu cầu về độ chính xác và chống ảo giác thông tin (Accuracy và Anti-Hallucination):",
        "Yêu cầu về độ chính xác truy xuất và triệt tiêu ảo giác thông tin:",
    ),
    (
        "dưới 3 chế độ hiển thị (Khối đặc 3D Shaded, khung dây Wireframe, bán trong suốt X-Ray) với 1.664 mặt tam giác kín nước (watertight mesh).",
        "dưới 3 chế độ hiển thị trực quan (khối đặc có bóng đổ, khung dây và bán trong suốt) với mô hình lưới 1.664 mặt tam giác khép kín.",
    ),
    (
        "chỉ mục đồ thị phân cấp pgvector HNSW (vector_cosine_ops) và động cơ bộ nhớ sinh viên dài hạn (SDU Student Memory Engine).",
        "chỉ mục đồ thị phân cấp pgvector HNSW theo độ đo Cosine và động cơ bộ nhớ sinh viên dài hạn phục vụ cá nhân hóa xuyên phiên.",
    ),
]


def export_word_pdf(docx_path, pdf_path):
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        doc = word.Documents.Open(os.path.abspath(docx_path), ReadOnly=False)
        doc.Repaginate()
        doc.ExportAsFixedFormat(os.path.abspath(pdf_path), 17)
        doc.Close(False)
    finally:
        word.Quit()


def sync_toc_page_numbers(docx_path, pdf_path):
    roman_map = {1: "i", 2: "ii", 3: "iii", 4: "iv", 5: "v", 6: "vi", 7: "vii"}
    roman_headings = {
        "LỜI CAM ĐOAN",
        "LỜI CẢM ƠN",
        "MỤC LỤC",
        "DANH MỤC CÁC CHỮ VIẾT TẮT VÀ KÝ HIỆU",
        "DANH MỤC BẢNG",
        "DANH MỤC HÌNH VẼ",
    }

    pdf = pymupdf.open(pdf_path)
    roman_top_lines = {}
    arabic_pages = []
    for pno in range(1, len(pdf)):
        raw_lines = [nfc(l.strip()) for l in pdf[pno].get_text("text").splitlines() if l.strip()]
        if pno <= 7:
            roman_top_lines[pno] = set(raw_lines[:3])
        else:
            norm_page = nfc(re.sub(r"\s+", " ", pdf[pno].get_text("text")).strip())
            arabic_pages.append((pno - 7, raw_lines[:4], norm_page))
    pdf.close()

    with zipfile.ZipFile(docx_path, "r") as zin:
        namelist = zin.namelist()
        files = {name: zin.read(name) for name in namelist}

    doc_root = ET.fromstring(files["word/document.xml"])
    body = doc_root.find(f"{W}body")

    checked = 0
    updated = 0
    unmatched = []

    for p in body.iter(f"{W}p"):
        if not any(True for _ in p.iter(f"{W}tab")):
            continue
        ts = list(p.iter(f"{W}t"))
        if len(ts) < 2:
            continue
        checked += 1
        label = nfc(re.sub(r"\s+", " ", "".join(t.text or "" for t in ts[:-1]).strip()))
        cur_pg = (ts[-1].text or "").strip()

        found_pg = None
        if label in roman_headings:
            for pno, top_set in roman_top_lines.items():
                if label in top_set:
                    found_pg = roman_map[pno]
                    break
        else:
            m_prefix = re.match(r"^((?:Bảng|Hình)\s+\d+\.\d+\.|\d+(?:\.\d+)*\.)", label)
            for ar_pg, top_lines, ptxt in arabic_pages:
                if label in (
                    "MỞ ĐẦU",
                    "KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN",
                    "TÀI LIỆU THAM KHẢO",
                ) or label.startswith("CHƯƠNG "):
                    if any(label in tl or tl in label for tl in top_lines if len(tl) >= 6):
                        found_pg = str(ar_pg)
                        break
                elif label in ptxt or (m_prefix and m_prefix.group(1) in ptxt and label[:30] in ptxt):
                    found_pg = str(ar_pg)
                    break

        if found_pg is None:
            unmatched.append((label, cur_pg))
        elif found_pg != cur_pg:
            ts[-1].text = found_pg
            updated += 1

    print(f"TOC/LOT/LOF sync: checked={checked}, updated={updated}, unmatched={len(unmatched)}")
    for item in unmatched:
        print(f"  UNMATCHED TOC ENTRY: {item}")

    if updated > 0:
        files["word/document.xml"] = ET.tostring(
            doc_root, encoding="utf-8", xml_declaration=True, standalone=True
        )
        with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as zout:
            for name in namelist:
                zout.writestr(name, files[name])
        export_word_pdf(docx_path, pdf_path)
        print(f"Re-exported {pdf_path} with synced TOC/LOT/LOF page numbers.")


def apply_fixes(src_docx, dst_docx, dst_pdf):
    with zipfile.ZipFile(src_docx, "r") as zin:
        namelist = zin.namelist()
        files = {name: zin.read(name) for name in namelist}

    doc_root = ET.fromstring(files["word/document.xml"])
    styles_root = ET.fromstring(files["word/styles.xml"])

    for st in styles_root.findall(f"{W}style"):
        sid = st.get(f"{W}styleId")
        if sid in ("Heading2", "Heading3", "Heading4"):
            pPr = st.find(f"{W}pPr")
            if pPr is not None:
                jc = pPr.find(f"{W}jc")
                if jc is not None:
                    jc.set(f"{W}val", "left")
        if sid == "Caption":
            rPr = st.find(f"{W}rPr")
            if rPr is not None:
                for itag in ("i", "iCs"):
                    iel = rPr.find(f"{W}{itag}")
                    if iel is not None:
                        rPr.remove(iel)

    body = doc_root.find(f"{W}body")

    tc_fixed = 0
    for tbl in body.findall(f"{W}tbl"):
        for tc in tbl.iter(f"{W}tc"):
            for p in tc.findall(f"{W}p"):
                pPr = p.find(f"{W}pPr")
                if pPr is not None:
                    sp = pPr.find(f"{W}spacing")
                    if sp is not None:
                        if sp.get(f"{W}before") == "12":
                            sp.set(f"{W}before", "8")
                        if sp.get(f"{W}after") == "12":
                            sp.set(f"{W}after", "8")
                        if sp.get(f"{W}line") == "224":
                            sp.set(f"{W}line", "218")
                jc_el = pPr.find(f"{W}jc") if pPr is not None else None
                jc_val = jc_el.get(f"{W}val") if jc_el is not None else None
                pStyle_el = pPr.find(f"{W}pStyle") if pPr is not None else None
                pStyle_val = pStyle_el.get(f"{W}val") if pStyle_el is not None else None
                if jc_val == "both" or (jc_val is None and pStyle_val in ("4-DoanVB", "2-Tru")):
                    set_p_jc(p, "left")
                    tc_fixed += 1

    struct_fixed = 0
    for p in body.iter(f"{W}p"):
        # Skip table paragraphs already handled above
        if p.getparent() is not None and p.getparent().tag == f"{W}tc":
            continue
        txt = "".join(t.text or "" for t in p.iter(f"{W}t")).strip()
        if not txt:
            continue
        pPr = p.find(f"{W}pPr")
        st = (
            pPr.find(f"{W}pStyle").get(f"{W}val")
            if (pPr is not None and pPr.find(f"{W}pStyle") is not None)
            else None
        )
        jc = (
            pPr.find(f"{W}jc").get(f"{W}val")
            if (pPr is not None and pPr.find(f"{W}jc") is not None)
            else None
        )
        has_tab = any(True for _ in p.iter(f"{W}tab"))

        if has_tab and jc == "both":
            set_p_jc(p, "left")
            struct_fixed += 1
        elif st is None and jc == "both" and (
            re.match(r"^Bảng\s+\d+\.\d+\.", txt)
            or re.match(
                r"^[1-8]\.\s+(Tính cấp thiết|Mục tiêu|Điều kiện|Nhiệm vụ|Đối tượng|Phương pháp|Ý nghĩa|Kết cấu)",
                txt,
            )
        ):
            set_p_jc(p, "left")
            struct_fixed += 1
        elif re.match(r"^\[\d+\]\s+", txt):
            set_p_jc(p, "left")
            struct_fixed += 1

    replaced_paras = 0
    for p in body.iter(f"{W}p"):
        if replace_in_paragraph_runs(p, GLOBAL_REPLACEMENTS):
            replaced_paras += 1

    files["word/document.xml"] = ET.tostring(
        doc_root, encoding="utf-8", xml_declaration=True, standalone=True
    )
    files["word/styles.xml"] = ET.tostring(
        styles_root, encoding="utf-8", xml_declaration=True, standalone=True
    )

    tmp_docx = dst_docx + ".tmp.docx"
    with zipfile.ZipFile(tmp_docx, "w", zipfile.ZIP_DEFLATED) as zout:
        for name in namelist:
            zout.writestr(name, files[name])
    shutil.move(tmp_docx, dst_docx)

    print(
        f"Wrote {dst_docx} (tc_fixed={tc_fixed}, struct_fixed={struct_fixed}, replaced_paras={replaced_paras})"
    )

    export_word_pdf(dst_docx, dst_pdf)
    print(f"Exported initial PDF: {dst_pdf}")
    sync_toc_page_numbers(dst_docx, dst_pdf)


def safe_copy_file(src, dst):
    with open(src, "rb") as fsrc:
        data = fsrc.read()
    tmp = dst + ".tmp"
    with open(tmp, "wb") as fdst:
        fdst.write(data)
    try:
        os.replace(tmp, dst)
    except OSError:
        os.remove(tmp)
        with open(dst, "wb") as fdst:
            fdst.write(data)


def audit_pdf(pdf_path, docx_path):
    doc = pymupdf.open(pdf_path)
    print(f"\n=== AUDIT {pdf_path}: {len(doc)} pages ===")

    wide_lines = []
    wide_cells = []
    orphan_lines = []
    for pno in range(1, len(doc)):
        page = doc[pno]
        tbls = page.find_tables().tables
        tbl_bboxes = [t.bbox for t in tbls]

        def in_tbl(x, y):
            return any(
                tb[0] - 2 <= x <= tb[2] + 2 and tb[1] - 2 <= y <= tb[3] + 2
                for tb in tbl_bboxes
            )

        blocks = page.get_text("dict")["blocks"]
        for b in blocks:
            if "lines" not in b or len(b["lines"]) < 2:
                continue
            l0_w = b["lines"][0]["bbox"][2] - b["lines"][0]["bbox"][0]
            if l0_w > 340 and not in_tbl(b["lines"][0]["bbox"][0], b["lines"][0]["bbox"][1]):
                last_txt = "".join(s["text"] for s in b["lines"][-1]["spans"]).strip()
                if (
                    last_txt
                    and "...." not in last_txt
                    and not re.match(r"^\(\d+\.\d+\)$", last_txt)
                ):
                    w_tokens = last_txt.split()
                    if len(w_tokens) == 1 and len(last_txt) <= 10:
                        prev_txt = "".join(s["text"] for s in b["lines"][-2]["spans"]).strip()
                        orphan_lines.append((pno + 1, prev_txt[-50:], last_txt))

        words = page.get_text("words")
        by_block = defaultdict(list)
        for w in words:
            if not in_tbl((w[0] + w[2]) / 2, (w[1] + w[3]) / 2):
                by_block[w[5]].append(w)

        for bno, ws in by_block.items():
            rows = []
            for w in sorted(ws, key=lambda x: (x[1], x[0])):
                for r in rows:
                    if abs(w[1] - r[0][1]) < 3.5:
                        r.append(w)
                        break
                else:
                    rows.append([w])

            for r in rows:
                r.sort(key=lambda x: x[0])
                if len(r) < 3 or r[0][0] < 75:
                    continue
                text = " ".join(w[4] for w in r)
                if "...." in text or ". . ." in text or "∑" in text or ("=" in text and r[0][0] > 170):
                    continue
                lw = r[-1][2] - r[0][0]
                if lw < 330:
                    continue
                gaps = [r[i + 1][0] - r[i][2] for i in range(len(r) - 1)]
                start_idx = 1 if (r[0][4] == "-" and len(gaps) > 1 and 7.0 < gaps[0] < 16.0) else 0
                word_gaps = [g for g in gaps[start_idx:] if g > 0.3]
                if word_gaps and max(word_gaps) > 5.8:
                    wide_lines.append((pno + 1, sum(word_gaps) / len(word_gaps), max(word_gaps), lw, text))

        for tbl in tbls:
            for cell in tbl.cells:
                if not cell:
                    continue
                cws = [
                    w
                    for w in words
                    if cell[0] - 1 <= (w[0] + w[2]) / 2 <= cell[2] + 1
                    and cell[1] - 1 <= (w[1] + w[3]) / 2 <= cell[3] + 1
                ]
                rows = []
                for w in sorted(cws, key=lambda x: (x[1], x[0])):
                    for r in rows:
                        if abs(w[1] - r[0][1]) < 3.5:
                            r.append(w)
                            break
                    else:
                        rows.append([w])
                for r in rows:
                    r.sort(key=lambda x: x[0])
                    if len(r) < 2:
                        continue
                    gaps = [r[i + 1][0] - r[i][2] for i in range(len(r) - 1) if r[i + 1][0] - r[i][2] > 0.3]
                    if r[0][4] == "-" and len(gaps) > 1:
                        gaps = gaps[1:]
                    if gaps and max(gaps) > 5.8:
                        wide_cells.append((pno + 1, max(gaps), " ".join(w[4] for w in r)))

    doc.close()

    with zipfile.ZipFile(docx_path, "r") as zin:
        dxml = zin.read("word/document.xml").decode("utf-8")

    italics_count = len(re.findall(r"<w:i(?:\s|/>|>)", dxml)) + len(
        re.findall(r"<w:iCs(?:\s|/>|>)", dxml)
    )
    long_dashes = dxml.count("—") + dxml.count("–")
    advisor_ok = "ThS. Hoàng Thị Ngát" in dxml
    glue_ext = len(re.findall(r"\s\.(?:DXF|STL|OBJ|SVG|SCR|SCAD|PDF|DOCX)\b", dxml))

    print(f"Wide body lines (max_gap > 5.8pt): {len(wide_lines)}")
    for pno, avg_g, max_g, lw, txt in sorted(wide_lines, key=lambda x: (-x[2], x[0])):
        print(f"  P.{pno:02d} avg={avg_g:5.2f}pt max={max_g:5.2f}pt lw={lw:5.1f} | {txt[:90]}")

    print(f"Wide cell lines (max_gap > 5.8pt): {len(wide_cells)}")
    for pno, max_g, txt in wide_cells[:10]:
        print(f"  P.{pno:02d} max={max_g:5.2f}pt | {txt[:80]}")

    print(f"Orphan 1-word tail lines: {len(orphan_lines)}")
    for pno, prev_t, last_t in orphan_lines:
        print(f"  P.{pno:02d}: ...{prev_t!r} -> {last_t!r}")

    print(
        f"Constraints: doc_italics={italics_count}, long_dashes={long_dashes}, "
        f"advisor_ok={advisor_ok}, dot_ext_glue={glue_ext}"
    )


if __name__ == "__main__":
    apply_fixes("BaoCaoNguyenVanDat.docx", "BaoCaoNguyenVanDat.docx", "BaoCaoNguyenVanDat.pdf")
    audit_pdf("BaoCaoNguyenVanDat.pdf", "BaoCaoNguyenVanDat.docx")
    os.makedirs("docs", exist_ok=True)
    safe_copy_file("BaoCaoNguyenVanDat.docx", os.path.join("docs", "BaoCaoNguyenVanDat.docx"))
    safe_copy_file("BaoCaoNguyenVanDat.pdf", os.path.join("docs", "BaoCaoNguyenVanDat.pdf"))
    print("Synced BaoCaoNguyenVanDat.docx & .pdf -> docs/")
