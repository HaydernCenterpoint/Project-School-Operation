import copy
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
WP_URI = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
W14_URI = "http://schemas.microsoft.com/office/word/2010/wordml"
XML_URI = "http://www.w3.org/XML/1998/namespace"

W = f"{{{W_URI}}}"
WP = f"{{{WP_URI}}}"
W14 = f"{{{W14_URI}}}"
XML_SPACE = f"{{{XML_URI}}}space"

# Canonical schema order of child elements inside <w:pPr> (ECMA-376 CT_PPrBase)
PPR_ORDER = [
    "pStyle",
    "keepNext",
    "keepLines",
    "pageBreakBefore",
    "framePr",
    "widowControl",
    "numPr",
    "suppressLineNumbers",
    "pBdr",
    "shd",
    "tabs",
    "suppressAutoHyphens",
    "kinsoku",
    "wordWrap",
    "overflowPunct",
    "topLinePunct",
    "autoSpaceDE",
    "autoSpaceDN",
    "bidi",
    "adjustRightInd",
    "snapToGrid",
    "spacing",
    "ind",
    "contextualSpacing",
    "mirrorIndents",
    "suppressOverlap",
    "jc",
    "textDirection",
    "textAlignment",
    "textboxTightWrap",
    "outlineLvl",
    "divId",
    "cnfStyle",
    "rPr",
    "sectPr",
    "pPrChange",
]
PPR_RANK = {f"{W}{name}": idx for idx, name in enumerate(PPR_ORDER)}

RPR_ORDER = [
    "rStyle",
    "rFonts",
    "b",
    "bCs",
    "i",
    "iCs",
    "caps",
    "smallCaps",
    "strike",
    "dstrike",
    "outline",
    "shadow",
    "emboss",
    "imprint",
    "noProof",
    "snapToGrid",
    "vanish",
    "webHidden",
    "color",
    "spacing",
    "w",
    "kern",
    "position",
    "sz",
    "szCs",
    "highlight",
    "u",
    "effect",
    "bdr",
    "shd",
    "fitText",
    "vertAlign",
    "rtl",
    "cs",
    "em",
    "lang",
    "eastAsianLayout",
    "specVanish",
    "oMath",
]
RPR_RANK = {f"{W}{name}": idx for idx, name in enumerate(RPR_ORDER)}


def nfc(s):
    return unicodedata.normalize("NFC", s)


def sort_ppr(pPr):
    children = list(pPr)
    children.sort(key=lambda el: PPR_RANK.get(el.tag, 999))
    pPr[:] = children


def sort_rpr(rPr):
    children = list(rPr)
    children.sort(key=lambda el: RPR_RANK.get(el.tag, 999))
    rPr[:] = children


def ensure_ppr(p):
    pPr = p.find(f"{W}pPr")
    if pPr is None:
        pPr = ET.Element(f"{W}pPr")
        p.insert(0, pPr)
    return pPr


def ensure_rpr(parent):
    rPr = parent.find(f"{W}rPr")
    if rPr is None:
        rPr = ET.Element(f"{W}rPr")
        parent.insert(0, rPr)
    return rPr


def set_ppr_child(pPr, local_name, attrs=None):
    tag = f"{W}{local_name}"
    el = pPr.find(tag)
    if el is None:
        el = ET.Element(tag)
        pPr.append(el)
    else:
        el.attrib.clear()
    if attrs:
        for k, v in attrs.items():
            el.set(f"{W}{k}" if not k.startswith("{") else k, str(v))
    sort_ppr(pPr)
    return el


def remove_ppr_child(pPr, local_name):
    el = pPr.find(f"{W}{local_name}")
    if el is not None:
        pPr.remove(el)


def set_rpr_flag(rPr, local_name, enabled=True):
    tag = f"{W}{local_name}"
    el = rPr.find(tag)
    if enabled:
        if el is None:
            el = ET.Element(tag)
            rPr.append(el)
        else:
            el.attrib.clear()
    else:
        if el is not None:
            rPr.remove(el)
    sort_rpr(rPr)


def set_rpr_tnr(rPr, size_half_pt=26, bold=None, italic=None, underline=None):
    rf = rPr.find(f"{W}rFonts")
    if rf is None:
        rf = ET.Element(f"{W}rFonts")
        rPr.append(rf)
    rf.attrib.clear()
    for attr in ("ascii", "hAnsi", "eastAsia", "cs"):
        rf.set(f"{W}{attr}", "Times New Roman")

    col = rPr.find(f"{W}color")
    if col is None:
        col = ET.Element(f"{W}color")
        rPr.append(col)
    col.attrib.clear()
    col.set(f"{W}val", "000000")

    if size_half_pt is not None:
        for sname in ("sz", "szCs"):
            sel = rPr.find(f"{W}{sname}")
            if sel is None:
                sel = ET.Element(f"{W}{sname}")
                rPr.append(sel)
            sel.attrib.clear()
            sel.set(f"{W}val", str(size_half_pt))

    if bold is not None:
        set_rpr_flag(rPr, "b", bold)
        set_rpr_flag(rPr, "bCs", bold)
    if italic is not None:
        set_rpr_flag(rPr, "i", italic)
        set_rpr_flag(rPr, "iCs", italic)
    if underline is not None:
        uel = rPr.find(f"{W}u")
        if underline:
            if uel is None:
                uel = ET.Element(f"{W}u")
                rPr.append(uel)
            uel.set(f"{W}val", "single")
        elif uel is not None:
            rPr.remove(uel)
    sort_rpr(rPr)


def make_run(text, size_half_pt=28, bold=False, italic=False, underline=False):
    r = ET.Element(f"{W}r")
    rPr = ET.SubElement(r, f"{W}rPr")
    set_rpr_tnr(rPr, size_half_pt=size_half_pt, bold=bold, italic=italic, underline=underline)
    t = ET.SubElement(r, f"{W}t")
    if text.startswith(" ") or text.endswith(" "):
        t.set(XML_SPACE, "preserve")
    t.text = text
    return r


def make_cover_para(
    runs_spec,
    before=0,
    after=0,
    line=276,
    jc="center",
    page_break_after=False,
    sect_pr=None,
):
    p = ET.Element(f"{W}p")
    pPr = ET.SubElement(p, f"{W}pPr")
    set_ppr_child(
        pPr,
        "spacing",
        {"before": str(before), "after": str(after), "line": str(line), "lineRule": "auto"},
    )
    set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
    set_ppr_child(pPr, "jc", {"val": jc})
    if sect_pr is not None:
        pPr.append(sect_pr)
        sort_ppr(pPr)
    for text, sz, b, it, u in runs_spec:
        p.append(make_run(text, size_half_pt=sz, bold=b, italic=it, underline=u))
    if page_break_after:
        r_br = ET.SubElement(p, f"{W}r")
        br = ET.SubElement(r_br, f"{W}br")
        br.set(f"{W}type", "page")
    return p


def clone_logo_para(orig_logo_p, cx, cy, doc_pr_id, before=120, after=120):
    p = copy.deepcopy(orig_logo_p)
    pPr = ensure_ppr(p)
    set_ppr_child(
        pPr,
        "spacing",
        {"before": str(before), "after": str(after), "line": "240", "lineRule": "auto"},
    )
    set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
    set_ppr_child(pPr, "jc", {"val": "center"})
    for ext in p.iter(f"{WP}extent"):
        ext.set("cx", str(cx))
        ext.set("cy", str(cy))
    for docPr in p.iter(f"{WP}docPr"):
        docPr.set("id", str(doc_pr_id))
        docPr.set("name", f"SDU Logo {doc_pr_id}")
    return p


def make_cover_info_table(rows_data, font_sz=28, left_w=4300, right_w=4770, left_pad=900, row_pad=45):
    tbl = ET.Element(f"{W}tbl")
    tblPr = ET.SubElement(tbl, f"{W}tblPr")
    tblW = ET.SubElement(tblPr, f"{W}tblW")
    tblW.set(f"{W}w", str(left_w + right_w))
    tblW.set(f"{W}type", "dxa")
    jc = ET.SubElement(tblPr, f"{W}jc")
    jc.set(f"{W}val", "center")
    tblBorders = ET.SubElement(tblPr, f"{W}tblBorders")
    for bname in ("top", "left", "bottom", "right", "insideH", "insideV"):
        bel = ET.SubElement(tblBorders, f"{W}{bname}")
        bel.set(f"{W}val", "none")
        bel.set(f"{W}sz", "0")
        bel.set(f"{W}space", "0")
        bel.set(f"{W}color", "auto")

    tblGrid = ET.SubElement(tbl, f"{W}tblGrid")
    c1 = ET.SubElement(tblGrid, f"{W}gridCol")
    c1.set(f"{W}w", str(left_w))
    c2 = ET.SubElement(tblGrid, f"{W}gridCol")
    c2.set(f"{W}w", str(right_w))

    for label, value in rows_data:
        tr = ET.SubElement(tbl, f"{W}tr")
        trPr = ET.SubElement(tr, f"{W}trPr")
        trJc = ET.SubElement(trPr, f"{W}jc")
        trJc.set(f"{W}val", "center")

        for col_idx, (cell_text, col_w, ind_left) in enumerate(
            [(label, left_w, left_pad), (value, right_w, 80)]
        ):
            tc = ET.SubElement(tr, f"{W}tc")
            tcPr = ET.SubElement(tc, f"{W}tcPr")
            tcW = ET.SubElement(tcPr, f"{W}tcW")
            tcW.set(f"{W}w", str(col_w))
            tcW.set(f"{W}type", "dxa")
            vAlign = ET.SubElement(tcPr, f"{W}vAlign")
            vAlign.set(f"{W}val", "center")

            p = ET.SubElement(tc, f"{W}p")
            pPr = ET.SubElement(p, f"{W}pPr")
            set_ppr_child(
                pPr,
                "spacing",
                {"before": str(row_pad), "after": str(row_pad), "line": "264", "lineRule": "auto"},
            )
            set_ppr_child(pPr, "ind", {"left": str(ind_left), "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "left"})
            p.append(make_run(cell_text, size_half_pt=font_sz, bold=True))

    return tbl


def build_two_sdu_covers(orig_logo_p, sect_pr):
    # Ensure rectangular page border applies to BOTH Cover Page 1 and Cover Page 2 in Section 1
    pg_borders = sect_pr.find(f"{W}pgBorders")
    if pg_borders is not None and f"{W}display" in pg_borders.attrib:
        del pg_borders.attrib[f"{W}display"]

    elements = []

    # =========================================================================
    # COVER PAGE 1: BÌA NGOÀI (Chuẩn mẫu ĐATN Trường Đại học Sao Đỏ)
    # =========================================================================
    elements.append(
        make_cover_para([("BỘ CÔNG THƯƠNG", 28, False, False, False)], before=60, after=30, line=264)
    )
    elements.append(
        make_cover_para(
            [
                ("TRƯỜNG ", 28, True, False, False),
                ("ĐẠI HỌC", 28, True, False, True),
                (" SAO ĐỎ", 28, True, False, False),
            ],
            before=0,
            after=140,
            line=264,
        )
    )
    elements.append(clone_logo_para(orig_logo_p, cx=1239078, cy=1327868, doc_pr_id=742181624, before=180, after=220))
    elements.append(
        make_cover_para([("ĐỒ ÁN TỐT NGHIỆP", 52, True, False, False)], before=240, after=80, line=276)
    )
    elements.append(
        make_cover_para([("Ngành: Công nghệ thông tin", 32, True, False, False)], before=0, after=320, line=276)
    )
    elements.append(
        make_cover_para([("TÊN ĐỀ TÀI:", 28, True, False, False)], before=40, after=80, line=276)
    )
    for idx, line_txt in enumerate(
        [
            "NGHIÊN CỨU VÀ XÂY DỰNG TRỢ LÝ HỌC TẬP THÔNG MINH",
            "ỨNG DỤNG GENERATIVE AI (ARTIFICIAL INTELLIGENCE)",
            "VÀ RETRIEVAL-AUGMENTED GENERATION",
            "HỖ TRỢ SINH VIÊN ĐẠI HỌC",
        ]
    ):
        elements.append(
            make_cover_para(
                [(line_txt, 29, True, False, False)],
                before=0,
                after=420 if idx == 3 else 45,
                line=288,
            )
        )

    elements.append(
        make_cover_info_table(
            [
                ("Họ và tên sinh viên:", "Nguyễn Văn Đạt"),
                ("Lớp, khóa:", "DK13-CNTT1 (2021 - 2026)"),
                ("Giảng viên hướng dẫn:", "ThS. Hoàng Thị Ngát"),
            ],
            font_sz=28,
            left_w=4350,
            right_w=4720,
            left_pad=980,
            row_pad=55,
        )
    )
    elements.append(
        make_cover_para(
            [("HẢI PHÒNG - NĂM 2026", 28, True, False, False)],
            before=5160,
            after=0,
            line=264,
            page_break_after=True,
        )
    )

    # =========================================================================
    # COVER PAGE 2: TRANG PHỤ BÌA (Điền đầy đủ thông tin SV & Hội đồng 8 - QĐ 668/QĐ-ĐHSĐ)
    # =========================================================================
    elements.append(
        make_cover_para([("BỘ CÔNG THƯƠNG", 28, False, False, False)], before=40, after=20, line=264)
    )
    elements.append(
        make_cover_para(
            [
                ("TRƯỜNG ", 28, True, False, False),
                ("ĐẠI HỌC", 28, True, False, True),
                (" SAO ĐỎ", 28, True, False, False),
            ],
            before=0,
            after=24,
            line=264,
        )
    )
    elements.append(
        make_cover_para([("KHOA CÔNG NGHỆ THÔNG TIN", 26, True, False, False)], before=0, after=70, line=264)
    )
    elements.append(clone_logo_para(orig_logo_p, cx=1020000, cy=1093100, doc_pr_id=742181625, before=50, after=90))
    elements.append(
        make_cover_para([("ĐỒ ÁN TỐT NGHIỆP", 48, True, False, False)], before=60, after=40, line=264)
    )
    elements.append(
        make_cover_para([("Ngành: Công nghệ thông tin", 28, True, False, False)], before=0, after=24, line=264)
    )
    elements.append(
        make_cover_para(
            [("Trình độ đào tạo: Đại học (Cấp bằng kỹ sư)", 26, False, False, False)],
            before=0,
            after=120,
            line=264,
        )
    )
    elements.append(
        make_cover_para([("TÊN ĐỀ TÀI:", 28, True, False, False)], before=10, after=45, line=264)
    )
    for idx, line_txt in enumerate(
        [
            "NGHIÊN CỨU VÀ XÂY DỰNG TRỢ LÝ HỌC TẬP THÔNG MINH",
            "ỨNG DỤNG GENERATIVE AI (ARTIFICIAL INTELLIGENCE)",
            "VÀ RETRIEVAL-AUGMENTED GENERATION",
            "HỖ TRỢ SINH VIÊN ĐẠI HỌC",
        ]
    ):
        elements.append(
            make_cover_para(
                [(line_txt, 28, True, False, False)],
                before=0,
                after=170 if idx == 3 else 30,
                line=276,
            )
        )

    elements.append(
        make_cover_info_table(
            [
                ("Họ và tên sinh viên:", "Nguyễn Văn Đạt"),
                ("Mã sinh viên:", "2200286"),
                ("Lớp, khóa:", "DK13-CNTT1 - Khóa 13 (2021 - 2026)"),
                ("Giảng viên hướng dẫn:", "ThS. Hoàng Thị Ngát"),
                ("Hội đồng đánh giá:", "Hội đồng số 8 (QĐ số 668/QĐ-ĐHSĐ)"),
                ("Chủ tịch hội đồng:", "ThS. Vũ Bảo Tạo"),
                ("Ủy viên - thư ký:", "ThS. Hoàng Thị Ngát"),
                ("Ủy viên - phản biện:", "ThS. Hoàng Thị An"),
                ("Ủy viên:", "ThS. Nguyễn Thị Thu"),
            ],
            font_sz=26,
            left_w=4150,
            right_w=4920,
            left_pad=620,
            row_pad=24,
        )
    )
    elements.append(
        make_cover_para(
            [("HẢI PHÒNG - NĂM 2026", 28, True, False, False)],
            before=2640,
            after=0,
            line=264,
            sect_pr=sect_pr,
        )
    )

    return elements


def make_body_prose_para(text):
    p = ET.Element(f"{W}p")
    pPr = ET.SubElement(p, f"{W}pPr")
    set_ppr_child(pPr, "pStyle", {"val": "4-DoanVB"})
    set_ppr_child(
        pPr,
        "spacing",
        {"before": "60", "after": "60", "line": "288", "lineRule": "auto"},
    )
    set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
    set_ppr_child(pPr, "jc", {"val": "both"})

    r = ET.SubElement(p, f"{W}r")
    rPr = ET.SubElement(r, f"{W}rPr")
    set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)
    t = ET.SubElement(r, f"{W}t")
    t.text = text
    return p


def update_styles_xml(styles_root):
    # 1. docDefaults: 13pt Times New Roman, Before 3pt (60), After 3pt (60), Multiple 1.2 (288)
    dd = styles_root.find(f"{W}docDefaults")
    if dd is not None:
        pPrDef = dd.find(f"{W}pPrDefault")
        if pPrDef is not None:
            pPr = ensure_ppr(pPrDef)
            remove_ppr_child(pPr, "contextualSpacing")
            set_ppr_child(
                pPr,
                "spacing",
                {"before": "60", "after": "60", "line": "288", "lineRule": "auto"},
            )
        rPrDef = dd.find(f"{W}rPrDefault")
        if rPrDef is not None:
            rPr = ensure_rpr(rPrDef)
            set_rpr_tnr(rPr, size_half_pt=26)

    for st in styles_root.findall(f"{W}style"):
        sid = st.get(f"{W}styleId")
        if sid in ("Normal", "4-DoanVB", "2-Tru", "Heading2", "Heading3", "Heading4", "Caption"):
            pPr = ensure_ppr(st)
            remove_ppr_child(pPr, "contextualSpacing")
            set_ppr_child(
                pPr,
                "spacing",
                {"before": "60", "after": "60", "line": "288", "lineRule": "auto"},
            )

        if sid == "Normal":
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26)

        elif sid == "4-DoanVB":
            pPr = ensure_ppr(st)
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)

        elif sid == "2-Tru":
            pPr = ensure_ppr(st)
            set_ppr_child(pPr, "jc", {"val": "both"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)

        elif sid == "Heading1":
            pPr = ensure_ppr(st)
            remove_ppr_child(pPr, "numPr")
            remove_ppr_child(pPr, "contextualSpacing")
            set_ppr_child(
                pPr,
                "spacing",
                {"before": "120", "after": "120", "line": "288", "lineRule": "auto"},
            )
            set_ppr_child(pPr, "jc", {"val": "center"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=28, bold=True, italic=False)

        elif sid == "Heading2":
            pPr = ensure_ppr(st)
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=True, italic=False)

        elif sid == "Heading3":
            # Tiểu mục 3 cấp: đậm nghiêng, lùi đầu dòng (1.27cm = 720 dxa), căn đều 2 bên
            pPr = ensure_ppr(st)
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=True, italic=True)

        elif sid == "Heading4":
            pPr = ensure_ppr(st)
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=True)

        elif sid == "Caption":
            # Tên hình: căn giữa dòng, không lùi đầu dòng, giãn 3pt/3pt/1.2
            pPr = ensure_ppr(st)
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "center"})
            rPr = ensure_rpr(st)
            set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)


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
            t_nodes[0].set(XML_SPACE, "preserve")
        return True

    if any(True for _ in p.iter(f"{W}tab")):
        # For TOC lines, first t_node(s) hold title, last t_node holds page number
        ts = t_nodes[:-1]
        label = "".join(t.text or "" for t in ts)
        new_label = label
        for old, new in replacements:
            if old in new_label:
                new_label = new_label.replace(old, new)
        if new_label != label and ts:
            ts[0].text = new_label
            if new_label.startswith(" ") or new_label.endswith(" "):
                ts[0].set(XML_SPACE, "preserve")
            for extra in ts[1:]:
                extra.text = ""
            return True
        return False

    t_nodes[0].text = new_full
    if new_full.startswith(" ") or new_full.endswith(" "):
        t_nodes[0].set(XML_SPACE, "preserve")
    for t in t_nodes[1:]:
        t.text = ""
    return True


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


def int_to_roman(n):
    vals = [
        (10, "x"),
        (9, "ix"),
        (5, "v"),
        (4, "iv"),
        (1, "i"),
    ]
    out = []
    for v, sym in vals:
        while n >= v:
            out.append(sym)
            n -= v
    return "".join(out)


def sync_toc_page_numbers(docx_path, pdf_path, cover_pages=2):
    roman_headings = {
        "LỜI CAM ĐOAN",
        "LỜI CẢM ƠN",
        "MỤC LỤC",
        "DANH MỤC CÁC CHỮ VIẾT TẮT VÀ KÝ HIỆU",
        "DANH MỤC BẢNG",
        "DANH MỤC HÌNH VẼ",
    }

    pdf = pymupdf.open(pdf_path)
    # Detect exact page index where Arabic Page 1 ("MỞ ĐẦU") begins
    mo_dau_pno = None
    for pno in range(cover_pages, len(pdf)):
        raw_lines = [nfc(l.strip()) for l in pdf[pno].get_text("text").splitlines() if l.strip()]
        if any(l == "MỞ ĐẦU" for l in raw_lines[:4]):
            mo_dau_pno = pno
            break
    if mo_dau_pno is None:
        raise RuntimeError("Could not locate 'MỞ ĐẦU' start page in exported PDF!")

    roman_top_lines = {}
    for pno in range(cover_pages, mo_dau_pno):
        roman_idx = pno - cover_pages + 1
        raw_lines = [nfc(l.strip()) for l in pdf[pno].get_text("text").splitlines() if l.strip()]
        roman_top_lines[roman_idx] = set(raw_lines[:4])

    arabic_pages = []
    for pno in range(mo_dau_pno, len(pdf)):
        ar_pg = pno - mo_dau_pno + 1
        raw_lines = [nfc(l.strip()) for l in pdf[pno].get_text("text").splitlines() if l.strip()]
        norm_page = nfc(re.sub(r"\s+", " ", pdf[pno].get_text("text")).strip())
        arabic_pages.append((ar_pg, raw_lines[:5], norm_page))

    total_pdf_pages = len(pdf)
    max_arabic_page = arabic_pages[-1][0] if arabic_pages else 0
    pdf.close()

    print(
        f"PDF layout: total={total_pdf_pages} pages | covers=1..{cover_pages} | "
        f"roman=i..{int_to_roman(mo_dau_pno - cover_pages)} ({mo_dau_pno - cover_pages} pages) | "
        f"arabic=1..{max_arabic_page} ({max_arabic_page} pages)"
    )

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
            for r_idx, top_set in roman_top_lines.items():
                if label in top_set:
                    found_pg = int_to_roman(r_idx)
                    break
        else:
            m_prefix = re.match(r"^((?:Bảng|Hình)\s+\d+\.\d+\.|\d+(?:\.\d+)*\.)", label)
            for ar_pg, top_lines, ptxt in arabic_pages:
                if label in (
                    "MỞ ĐẦU",
                    "KẾT LUẬN",
                    "KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN",
                    "TÀI LIỆU THAM KHẢO",
                ) or label.startswith("CHƯƠNG "):
                    joined_top = nfc(" ".join(top_lines))
                    if label in joined_top or any(label == tl for tl in top_lines):
                        found_pg = str(ar_pg)
                        break
                elif label in ptxt or (
                    m_prefix and m_prefix.group(1) in ptxt and label[:28] in ptxt
                ):
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
        tmp_docx = docx_path + ".toc.tmp"
        with zipfile.ZipFile(tmp_docx, "w", zipfile.ZIP_DEFLATED) as zout:
            for name in namelist:
                zout.writestr(name, files[name])
        safe_copy_file(tmp_docx, docx_path)
        if os.path.exists(tmp_docx):
            os.remove(tmp_docx)
        export_word_pdf(docx_path, pdf_path)
        print("Re-exported PDF with 100% synced TOC/LOT/LOF page numbers.")

    return total_pdf_pages, mo_dau_pno, max_arabic_page


def safe_copy_file(src, dst):
    with open(src, "rb") as fsrc:
        data = fsrc.read()
    tmp = dst + ".tmp"
    with open(tmp, "wb") as fdst:
        fdst.write(data)
    try:
        os.replace(tmp, dst)
    except OSError:
        if os.path.exists(tmp):
            os.remove(tmp)
        with open(dst, "wb") as fdst:
            fdst.write(data)


# Replacements for headings/paragraphs to eliminate 1-word orphans cleanly without touching spacing
TEXT_REFINEMENTS = [
    # Heading 1.1.2 (3.png: "Không để chữ mồ côi: 1.1.2, 2.4.2") — update both TOC and body heading!
    (
        "1.1.2. Nhu cầu cá nhân hóa lộ trình học tập và bài toán trợ lý học tập thông minh 24/7",
        "1.1.2. Nhu cầu cá nhân hóa lộ trình học tập và xây dựng trợ lý học tập thông minh 24/7",
    ),
    # Heading 2.4.2 — update both TOC and body heading so it wraps cleanly without orphan 'phần'
    (
        "2.4.2. Đặc tả chi tiết các bảng dữ liệu quản trị đơn vị, hồ sơ sinh viên và lớp học phần",
        "2.4.2. Đặc tả chi tiết nhóm bảng dữ liệu quản trị đơn vị, hồ sơ sinh viên và lớp học phần",
    ),
    # Eliminate all 22 post-reflow 1-word orphans across headings, captions, prose, and bibliography
    (
        "giữa cổng thông tin đào tạo (daotao.saodo.edu.vn), hệ thống quản lý lớp học phần và công cụ hỏi đáp AI độc lập.",
        "giữa cổng đào tạo (daotao.saodo.edu.vn), hệ thống lớp học phần và công cụ hỏi đáp AI độc lập.",
    ),
    (
        "và các tài liệu đặc tả kỹ thuật của Next.js, React, Supabase PostgreSQL.",
        "cùng tài liệu đặc tả kỹ thuật của Next.js, React và PostgreSQL.",
    ),
    (
        "sử dụng cơ chế chú ý đa đầu (Multi-Head Attention - MHA) hoặc chú ý truy vấn nhóm (Grouped-Query Attention - GQA):",
        "sử dụng cơ chế chú ý đa đầu (MHA) hoặc cơ chế chú ý truy vấn nhóm (Grouped-Query Attention - GQA):",
    ),
    (
        "mà không bao giờ gặp lỗi từ ngoài từ điển (Out-Of-Vocabulary - OOV).",
        "mà không gặp lỗi từ ngoài từ điển (Out-Of-Vocabulary - OOV).",
    ),
    (
        "xác suất sinh ra chuỗi câu trả lời Y = (y_1, y_2, ..., y_T) được phân rã thành tích các xác suất có điều kiện tại từng bước thời gian t:",
        "xác suất sinh chuỗi câu trả lời Y = (y_1, y_2, ..., y_T) được phân rã thành tích xác suất có điều kiện tại bước thời gian t:",
    ),
    (
        "1.3.1. Hiện tượng ảo giác thông tin (Hallucination) trong các mô hình ngôn ngữ lớn",
        "1.3.1. Hiện tượng ảo giác thông tin (Hallucination) ở mô hình ngôn ngữ lớn",
    ),
    (
        "Trong ngữ cảnh giáo dục đại học, ảo giác thông tin được chia thành hai dạng chính:",
        "Trong môi trường đào tạo đại học, ảo giác thông tin gồm hai nhóm chính:",
    ),
    (
        "điểm chuyên cần - giữa kỳ - cuối kỳ, GPA từng đợt, lịch theo tiến độ, thông tin điểm danh và phiếu thu học phí điện tử.",
        "điểm thành phần, GPA từng đợt, lịch học theo tiến độ, dữ liệu điểm danh và phiếu thu học phí điện tử.",
    ),
    (
        "Vùng chồng lấp ΔL đảm bảo các mệnh đề học thuật, định nghĩa hoặc đoạn mã nằm ở ranh giới cắt không bị mất ngữ cảnh liên kết.",
        "Vùng chồng lấp ΔL đảm bảo các mệnh đề học thuật, định nghĩa hoặc đoạn mã tại ranh giới cắt không mất ngữ cảnh.",
    ),
    (
        "thực tập tốt nghiệp (mã 0101103566 - 8 tín chỉ) và đồ án tốt nghiệp (mã 0101103567 - 12 tín chỉ) để hoàn tất trọn vẹn 163/163 tín chỉ.",
        "thực tập tốt nghiệp (mã 0101103566 - 8 tín chỉ) và đồ án tốt nghiệp (mã 0101103567 - 12 tín chỉ) để hoàn thành toàn bộ 163 tín chỉ.",
    ),
    (
        "2.1.2. Phân tích các nhóm tác nhân (Actors) và yêu cầu chức năng của hệ thống",
        "2.1.2. Phân tích các tác nhân (Actors) và yêu cầu chức năng hệ thống",
    ),
    (
        "2.2.4. Mô hình hóa quy trình nghiệp vụ bằng sơ đồ hoạt động (Activity Diagrams)",
        "2.2.4. Mô hình hóa quy trình nghiệp vụ bằng sơ đồ hoạt động UML",
    ),
    (
        "ba quy trình nghiệp vụ cốt lõi của hệ thống được mô hình hóa chi tiết tại Hình 2.3, Hình 2.4 và Hình 2.5:",
        "ba quy trình nghiệp vụ cốt lõi được mô hình hóa chi tiết tại Hình 2.3, Hình 2.4 và Hình 2.5:",
    ),
    (
        "2.4. Thiết kế cơ sở dữ liệu quan hệ và cơ sở dữ liệu vector (Database và Vector Store Design)",
        "2.4. Thiết kế cơ sở dữ liệu quan hệ và kho dữ liệu vector (pgvector)",
    ),
    (
        "Bảng 2.9. Đặc tả cấu trúc bảng lớp học phần (public.classes, public.class_members và public.teacher_subject_classes)",
        "Bảng 2.9. Đặc tả cấu trúc nhóm bảng quản lý lớp học phần và phân công giảng dạy",
    ),
    (
        "3.2. Xây dựng luồng xử lý dữ liệu học thuật, động cơ RAG và mô hình ngôn ngữ lớn",
        "3.2. Xây dựng luồng xử lý dữ liệu học thuật và động cơ truy xuất RAG",
    ),
    (
        "Hình 3.3. Giao diện tổng quan cổng sinh viên của sinh viên Nguyễn Văn Đạt (MSV: 2200286)",
        "Hình 3.3. Giao diện tổng quan cổng học tập của sinh viên Nguyễn Văn Đạt",
    ),
    (
        "Hình 3.4. Giao diện chương trình khung đào tạo 163 tín chỉ (48 học phần qua 9 học kỳ)",
        "Hình 3.4. Giao diện chương trình khung đào tạo toàn khóa 163 tín chỉ",
    ),
    (
        "3.3.3. Giao diện không gian trợ lý học tập thông minh ứng dụng Generative AI và RAG",
        "3.3.3. Giao diện không gian trợ lý học tập thông minh tích hợp RAG",
    ),
    (
        "Hình 3.16. Giao diện quản lý bài tập và phòng chấm điểm trực tuyến dành cho giảng viên",
        "Hình 3.16. Giao diện quản lý bài tập và chấm điểm trực tuyến của giảng viên",
    ),
    (
        "3.4.2. Thực nghiệm đánh giá tốc độ phản hồi thời gian thực (Latency và Throughput)",
        "3.4.2. Thực nghiệm đánh giá độ trễ phản hồi và thông lượng hệ thống",
    ),
    (
        "IEEE Transactions on Pattern Analysis and Machine Intelligence, vol. 42, no. 4, pp. 824-836.",
        "IEEE Trans. Pattern Anal. Mach. Intell. (TPAMI), vol. 42, no. 4, pp. 824-836.",
    ),
    (
        "CHƯƠNG 3. TRIỂN KHAI XÂY DỰNG VÀ THỰC NGHIỆM HỆ THỐNG",
        "CHƯƠNG 3. TRIỂN KHAI VÀ THỰC NGHIỆM HỆ THỐNG",
    ),
    (
        "Advances in Neural Information Processing Systems (NeurIPS), vol. 30, pp. 5998-6008.",
        "Advances in Neural Information Processing Systems (NeurIPS 2017), vol. 30, pp. 5998-6008.",
    ),
    (
        "Neurocomputing, vol. 568, 127063.",
        "Neurocomputing, vol. 568, art. no. 127063.",
    ),
]


def apply_all_updates(
    src_docx,
    dst_docx,
    dst_pdf,
    img_height_scale=1.0,
    tbl_cell_pad=(8, 8, 218),
    extra_replacements=None,
):
    with zipfile.ZipFile(src_docx, "r") as zin:
        namelist = zin.namelist()
        files = {name: zin.read(name) for name in namelist}

    doc_root = ET.fromstring(files["word/document.xml"])
    styles_root = ET.fromstring(files["word/styles.xml"])

    # 1. Update styles.xml (3pt/3pt/1.2x, Heading2/3/4 jc=both, Heading3 bold+italic+firstLine=720, Caption center)
    update_styles_xml(styles_root)

    body = doc_root.find(f"{W}body")
    children = list(body)

    # 2. Locate Section 1 end (currently child with sectPr before LỜI CAM ĐOAN) and replace with 2 SDU Cover Pages
    sect1_end_idx = None
    orig_logo_p = None
    for idx, el in enumerate(children[:25]):
        if el.tag == f"{W}p" and el.find(f".//{WP}extent") is not None and orig_logo_p is None:
            orig_logo_p = copy.deepcopy(el)
        sp = el.find(f".//{W}sectPr")
        if sp is not None:
            sect1_end_idx = idx
            sect1_pr = copy.deepcopy(sp)
            break

    if sect1_end_idx is None or orig_logo_p is None:
        raise RuntimeError("Could not locate Section 1 cover boundary or SDU logo paragraph!")

    cover_elements = build_two_sdu_covers(orig_logo_p, sect1_pr)
    for el in children[: sect1_end_idx + 1]:
        body.remove(el)
    for pos, new_el in enumerate(cover_elements):
        body.insert(pos, new_el)

    cover_elem_count = len(cover_elements)
    print(f"Replaced Section 1 cover with {cover_elem_count} elements (2 bordered SDU cover pages).")

    # 3. Remove Kết luận Chương 1, Kết luận Chương 2, Kết luận Chương 3 from TOC and Body
    children = list(body)
    to_remove = []
    idx = cover_elem_count
    while idx < len(children):
        el = children[idx]
        if el.tag == f"{W}p":
            txt = nfc(" ".join("".join(el.itertext()).split()))
            has_tab = any(True for _ in el.iter(f"{W}tab"))
            if has_tab and re.match(r"^Kết luận Chương\s+[123]", txt):
                to_remove.append(el)
            elif not has_tab and re.match(r"^Kết luận Chương\s+[123]$", txt):
                to_remove.append(el)
                if idx + 1 < len(children) and children[idx + 1].tag == f"{W}p":
                    next_txt = nfc(" ".join("".join(children[idx + 1].itertext()).split()))
                    if not next_txt.startswith("CHƯƠNG ") and next_txt != "KẾT LUẬN":
                        to_remove.append(children[idx + 1])
                        idx += 1
        idx += 1

    for el in to_remove:
        body.remove(el)
    print(f"Removed {len(to_remove)} elements for Kết luận Chương 1/2/3 (TOC + body).")

    # 4. Insert 3 chapter summary paragraphs under "8. Kết cấu của đồ án" (after intro line)
    children = list(body)
    inserted_muc8 = False
    for idx in range(cover_elem_count, len(children)):
        el = children[idx]
        if el.tag != f"{W}p":
            continue
        txt = nfc(" ".join("".join(el.itertext()).split()))
        if "nội dung chính của báo cáo đồ án tốt nghiệp được tổ chức thành 3 chương như sau:" in txt:
            # Check if already inserted
            next_txt = (
                nfc(" ".join("".join(children[idx + 1].itertext()).split()))
                if idx + 1 < len(children)
                else ""
            )
            if not next_txt.startswith("Chương 1."):
                muc8_paras = [
                    make_body_prose_para(
                        "Chương 1. Cơ sở lý thuyết: Trình bày tổng quan về bài toán trợ lý học tập thông minh trong đào tạo tín chỉ đại học, khảo sát các nhóm hệ thống hiện có và hệ thống hóa cơ sở lý thuyết cốt lõi gồm mô hình ngôn ngữ lớn (LLMs), kiến trúc sinh văn bản tăng cường truy xuất (RAG), kỹ thuật nhúng văn bản (Text Embedding), cơ sở dữ liệu vector pgvector (HNSW) cùng bộ tiêu chí đánh giá hệ thống."
                    ),
                    make_body_prose_para(
                        "Chương 2. Phân tích và thiết kế hệ thống: Khảo sát hiện trạng nghiệp vụ tại Trường Đại học Sao Đỏ, xác định yêu cầu chức năng theo ba nhóm tác nhân và yêu cầu phi chức năng, mô hình hóa hệ thống bằng bộ biểu đồ UML (Use Case, Activity, Sequence), thiết kế kiến trúc tổng thể 5 tầng tích hợp động cơ RAG đa nguồn, bộ nhớ sinh viên dài hạn và lược đồ cơ sở dữ liệu 18 bảng bảo mật mức dòng (RLS)."
                    ),
                    make_body_prose_para(
                        "Chương 3. Triển khai và thực nghiệm hệ thống: Trình bày môi trường phát triển, quy trình cài đặt các phân hệ phần mềm trên nền tảng Next.js 16, React Native (Expo) và Supabase PostgreSQL, minh họa hệ thống giao diện thực tế theo vai trò, đồng thời công bố kết quả thực nghiệm định lượng về độ chính xác chống ảo giác, tốc độ phản hồi và kiểm thử an toàn dữ liệu tự động."
                    ),
                ]
                for offset, mp in enumerate(muc8_paras):
                    body.insert(idx + 1 + offset, mp)
                inserted_muc8 = True
            break
    print(f"Inserted Mục 8 3-chapter breakdown: {inserted_muc8}")

    # 5. Strip ALL negative character spacing (<w:spacing w:val="-..."/>) and width compression (<w:w/>) across ALL runs
    stripped_neg_runs = 0
    for r_el in body.iter(f"{W}r"):
        rPr = r_el.find(f"{W}rPr")
        if rPr is not None:
            sp = rPr.find(f"{W}spacing")
            if sp is not None:
                val = sp.get(f"{W}val", "0")
                try:
                    if int(val) < 0:
                        rPr.remove(sp)
                        stripped_neg_runs += 1
                except ValueError:
                    pass
            w_scale = rPr.find(f"{W}w")
            if w_scale is not None:
                rPr.remove(w_scale)

    print(f"Stripped negative character spacing on {stripped_neg_runs} runs (including 1.1.3).")

    # 6. Normalize Section 2 (front matter) & Section 3 (main report) paragraphs, headings, captions, images, tables
    children = list(body)
    # Find Section 2 end (sectPr before MỞ ĐẦU)
    sect2_end_idx = None
    for idx in range(cover_elem_count, len(children)):
        if children[idx].tag == f"{W}p" and children[idx].find(f".//{W}sectPr") is not None:
            sect2_end_idx = idx
            break
    if sect2_end_idx is None:
        raise RuntimeError("Could not locate Section 2 end boundary!")

    # Format Section 2 LỜI CAM ĐOAN & LỜI CẢM ƠN prose paragraphs to 3pt/3pt/1.2x as well, keep TOC/LOT/LOF compact
    for idx in range(cover_elem_count, sect2_end_idx + 1):
        el = children[idx]
        if el.tag != f"{W}p":
            continue
        if el.find(f".//{W}sectPr") is not None:
            continue
        has_tab = any(True for _ in el.iter(f"{W}tab"))
        txt = nfc(" ".join("".join(el.itertext()).split()))
        pPr = ensure_ppr(el)
        st_el = pPr.find(f"{W}pStyle")
        st_val = st_el.get(f"{W}val") if st_el is not None else None
        if st_val == "Heading1":
            remove_ppr_child(pPr, "numPr")
            remove_ppr_child(pPr, "contextualSpacing")
            set_ppr_child(pPr, "jc", {"val": "center"})
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "120", "line": "288", "lineRule": "auto"}
            )
        elif not has_tab and st_val == "4-DoanVB":
            remove_ppr_child(pPr, "contextualSpacing")
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
            set_ppr_child(pPr, "jc", {"val": "both"})

    # Format Section 3 (Main Report: MỞ ĐẦU, CHƯƠNG 1..3, KẾT LUẬN, TÀI LIỆU THAM KHẢO)
    h2_count = 0
    h3_count = 0
    fig_cap_count = 0
    img_para_count = 0
    prose_count = 0

    for idx in range(sect2_end_idx + 1, len(children)):
        el = children[idx]
        if el.tag == f"{W}tbl":
            b_pt, a_pt, line_tw = tbl_cell_pad
            for tc in el.iter(f"{W}tc"):
                for p in tc.findall(f"{W}p"):
                    pPr = ensure_ppr(p)
                    remove_ppr_child(pPr, "contextualSpacing")
                    set_ppr_child(
                        pPr,
                        "spacing",
                        {
                            "before": str(b_pt),
                            "after": str(a_pt),
                            "line": str(line_tw),
                            "lineRule": "auto",
                        },
                    )
                    jc_el = pPr.find(f"{W}jc")
                    jc_val = jc_el.get(f"{W}val") if jc_el is not None else None
                    if jc_val != "center" and jc_val != "right":
                        set_ppr_child(pPr, "jc", {"val": "left"})
            continue

        if el.tag != f"{W}p":
            continue

        txt = nfc(" ".join("".join(el.itertext()).split()))
        has_drawing = el.find(f".//{WP}extent") is not None
        pPr = ensure_ppr(el)
        remove_ppr_child(pPr, "contextualSpacing")

        st_el = pPr.find(f"{W}pStyle")
        st_val = st_el.get(f"{W}val") if st_el is not None else None

        # Image paragraphs in body
        if has_drawing:
            set_ppr_child(pPr, "keepNext")
            set_ppr_child(pPr, "keepLines")
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "center"})
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "240", "lineRule": "auto"}
            )
            if img_height_scale != 1.0:
                for ext in el.iter(f"{WP}extent"):
                    cx = int(ext.get("cx"))
                    cy = int(ext.get("cy"))
                    ext.set("cx", str(int(round(cx * img_height_scale))))
                    ext.set("cy", str(int(round(cy * img_height_scale))))
            img_para_count += 1
            continue

        if not txt:
            continue

        # Chapter / Major Section Headings (Heading1)
        if st_val == "Heading1":
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "center"})
            set_ppr_child(
                pPr, "spacing", {"before": "120", "after": "120", "line": "288", "lineRule": "auto"}
            )
            continue

        # 3-level subheadings (Heading3 or X.Y.Z.) -> Bold + Italic + First-Line Indent 720 + Justified + 3pt/3pt/1.2x
        if st_val == "Heading3" or re.match(r"^\d+\.\d+\.\d+\.\s+", txt):
            set_ppr_child(pPr, "pStyle", {"val": "Heading3"})
            set_ppr_child(pPr, "keepNext")
            set_ppr_child(pPr, "keepLines")
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "720"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            p_rpr = ensure_rpr(pPr)
            set_rpr_tnr(p_rpr, size_half_pt=26, bold=True, italic=True)
            sort_ppr(pPr)
            for r_el in el.findall(f"{W}r"):
                rPr = ensure_rpr(r_el)
                set_rpr_tnr(rPr, size_half_pt=26, bold=True, italic=True)
            h3_count += 1
            continue

        # 2-level subheadings (Heading2, X.Y., MỞ ĐẦU 1..8, KẾT LUẬN 1..3) -> Bold upright + Justified + 3pt/3pt/1.2x
        if (
            st_val == "Heading2"
            or re.match(r"^\d+\.\d+\.\s+", txt)
            or re.match(
                r"^[1-8]\.\s+(Tính cấp thiết|Mục tiêu|Điều kiện|Nhiệm vụ|Đối tượng|Phương pháp|Ý nghĩa|Kết cấu|Kết quả|Hạn chế|Hướng phát triển)",
                txt,
            )
        ):
            if st_val == "Heading2":
                set_ppr_child(pPr, "pStyle", {"val": "Heading2"})
            set_ppr_child(pPr, "keepNext")
            set_ppr_child(pPr, "keepLines")
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "both"})
            p_rpr = ensure_rpr(pPr)
            set_rpr_tnr(p_rpr, size_half_pt=26, bold=True, italic=False)
            sort_ppr(pPr)
            for r_el in el.findall(f"{W}r"):
                rPr = ensure_rpr(r_el)
                set_rpr_tnr(rPr, size_half_pt=26, bold=True, italic=False)
            h2_count += 1
            continue

        # Figure captions ("Hình X.Y. ...") -> Centered, no first-line indent, 3pt/3pt/1.2x
        if re.match(r"^Hình\s+\d+\.\d+\.", txt):
            set_ppr_child(pPr, "pStyle", {"val": "Caption"})
            set_ppr_child(pPr, "keepLines")
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "center"})
            for r_el in el.findall(f"{W}r"):
                rPr = ensure_rpr(r_el)
                set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)
            fig_cap_count += 1
            continue

        # Table captions ("Bảng X.Y. ...") -> Keep with next table, 3pt/3pt/1.2x, left-aligned
        if re.match(r"^Bảng\s+\d+\.\d+\.", txt):
            set_ppr_child(pPr, "keepNext")
            set_ppr_child(pPr, "keepLines")
            remove_ppr_child(pPr, "numPr")
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "ind", {"left": "0", "right": "0", "firstLine": "0"})
            set_ppr_child(pPr, "jc", {"val": "left"})
            for r_el in el.findall(f"{W}r"):
                rPr = ensure_rpr(r_el)
                set_rpr_tnr(rPr, size_half_pt=26, bold=False, italic=False)
            continue

        # Bibliography entries ("[1] ...") -> Left-aligned (avoid URL stretching), 3pt/3pt/1.2x
        if re.match(r"^\[\d+\]\s+", txt):
            set_ppr_child(
                pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
            )
            set_ppr_child(pPr, "jc", {"val": "left"})
            continue

        # All body prose & bullet & equation paragraphs -> 3pt/3pt/1.2x
        set_ppr_child(
            pPr, "spacing", {"before": "60", "after": "60", "line": "288", "lineRule": "auto"}
        )
        jc_el = pPr.find(f"{W}jc")
        jc_val = jc_el.get(f"{W}val") if jc_el is not None else None
        if jc_val != "center" and jc_val != "right":
            set_ppr_child(pPr, "jc", {"val": "both"})
        prose_count += 1

    print(
        f"Normalized main body: h2={h2_count}, h3={h3_count}, fig_caps={fig_cap_count}, "
        f"imgs={img_para_count}, prose={prose_count}"
    )

    # 7. Apply targeted text refinements (both TOC and Body) + enforce short hyphen rule
    all_repls = list(TEXT_REFINEMENTS)
    if extra_replacements:
        all_repls.extend(extra_replacements)

    replaced_count = 0
    for p in body.iter(f"{W}p"):
        if replace_in_paragraph_runs(p, all_repls):
            replaced_count += 1
        # Enforce 1.png rule: no en-dash or em-dash anywhere
        for t in p.iter(f"{W}t"):
            if t.text and ("–" in t.text or "—" in t.text):
                t.text = t.text.replace("–", "-").replace("—", "-")

    print(f"Applied text refinements on {replaced_count} paragraphs.")

    # 8. Write DOCX & export via Word COM
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
    safe_copy_file(tmp_docx, dst_docx)
    if os.path.exists(tmp_docx):
        os.remove(tmp_docx)

    export_word_pdf(dst_docx, dst_pdf)
    total_pages, mo_dau_pno, max_arabic = sync_toc_page_numbers(dst_docx, dst_pdf, cover_pages=2)
    return total_pages, mo_dau_pno, max_arabic


def audit_pdf_quality(pdf_path, mo_dau_pno):
    doc = pymupdf.open(pdf_path)
    print(f"\n=== AUDIT {pdf_path} (total={len(doc)} pages, MỞ ĐẦU starts at PDF P.{mo_dau_pno + 1}) ===")

    orphans = []
    wide_gaps = []

    for pno in range(mo_dau_pno, len(doc)):
        page = doc[pno]
        tbl_bboxes = [t.bbox for t in page.find_tables().tables]

        def in_tbl(x, y):
            return any(
                tb[0] - 2 <= x <= tb[2] + 2 and tb[1] - 2 <= y <= tb[3] + 2
                for tb in tbl_bboxes
            )

        # Group words into visual lines across the page (outside tables)
        words = [w for w in page.get_text("words") if not in_tbl((w[0] + w[2]) / 2, (w[1] + w[3]) / 2)]
        lines = []
        for w in sorted(words, key=lambda x: (x[1], x[0])):
            # Skip page footer number at y > 775
            if w[1] > 775 or w[3] < 50:
                continue
            for row in lines:
                if abs(w[1] - row[0][1]) < 4.0:
                    row.append(w)
                    break
            else:
                lines.append([w])

        for row in lines:
            row.sort(key=lambda x: x[0])

        # Check every visual line for:
        # (a) 1-word orphan tail line (1 word or <= 8 chars at the start of a line following a wide previous line)
        for li in range(1, len(lines)):
            cur = lines[li]
            prev = lines[li - 1]
            cur_txt = " ".join(w[4] for w in cur).strip()
            prev_txt = " ".join(w[4] for w in prev).strip()
            dy = cur[0][1] - prev[0][1]
            prev_w = prev[-1][2] - prev[0][0]
            # Same paragraph wrap typically has dy ~ 15-24.5pt and prev line reaches x1 > 480pt (including centered headings and ragged-right bibliography)
            if 12.0 <= dy <= 24.5 and prev[-1][2] > 480.0:
                tokens = cur_txt.split()
                if (
                    (len(tokens) == 1 or len(cur_txt) <= 7)
                    and not re.match(r"^\(\d+\.\d+\)$", cur_txt)
                    and not re.match(r"^\[\d+\]$", cur_txt)
                    and not cur_txt.startswith("http")
                ):
                    orphans.append((pno + 1, pno - mo_dau_pno + 1, prev_txt[-55:], cur_txt, round(cur[0][0], 1)))

        # (b) Stretched inter-word gaps (> 9.5 pt on body/heading lines)
        for cur in lines:
            if len(cur) < 3:
                continue
            cur_txt = " ".join(w[4] for w in cur)
            if "∑" in cur_txt or ("=" in cur_txt and cur[0][0] > 160):
                continue
            gaps = [cur[k + 1][0] - cur[k][2] for k in range(len(cur) - 1)]
            max_g = max(gaps)
            if max_g > 9.5:
                wide_gaps.append((pno + 1, pno - mo_dau_pno + 1, round(max_g, 2), cur_txt[:85]))

    doc.close()
    print(f"Orphan 1-word tail lines found: {len(orphans)}")
    for o in orphans:
        print(f"  ORPHAN PDF P.{o[0]} (Ar.{o[1]}) x0={o[4]}: ...{o[2]} | -> '{o[3]}'")
    print(f"Wide inter-word gap lines (>9.5pt) found: {len(wide_gaps)}")
    for wg in wide_gaps:
        print(f"  WIDE GAP PDF P.{wg[0]} (Ar.{wg[1]}) max_gap={wg[2]}pt: {wg[3]}")
    return orphans, wide_gaps


if __name__ == "__main__":
    root_dir = r"C:\Users\datmk\OneDrive\Desktop\Workspace\Project SDU"
    src_docx = os.path.join(root_dir, "BaoCaoNguyenVanDat.docx")
    bak_docx = os.path.join(root_dir, "docs", "captures", "qd668", "BaoCaoNguyenVanDat.pre_update.docx")
    os.makedirs(os.path.dirname(bak_docx), exist_ok=True)
    if not os.path.exists(bak_docx):
        shutil.copy2(src_docx, bak_docx)

    dst_docx = os.path.join(root_dir, "BaoCaoNguyenVanDat.docx")
    dst_pdf = os.path.join(root_dir, "BaoCaoNguyenVanDat.pdf")

    total_pages, mo_dau_pno, max_arabic = apply_all_updates(
        bak_docx,
        dst_docx,
        dst_pdf,
        img_height_scale=1.0,
        tbl_cell_pad=(8, 8, 218),
    )
    audit_pdf_quality(dst_pdf, mo_dau_pno)
    for rel_stem in ("BaoCaoNguyenVanDat", "BAO-CAO-DO-AN-TOT-NGHIEP-SDU"):
        docs_docx = os.path.join(root_dir, "docs", f"{rel_stem}.docx")
        docs_pdf = os.path.join(root_dir, "docs", f"{rel_stem}.pdf")
        if os.path.exists(os.path.dirname(docs_docx)):
            safe_copy_file(dst_docx, docs_docx)
            safe_copy_file(dst_pdf, docs_pdf)
            print(f"Synced docs/{rel_stem}.{{docx,pdf}}")
