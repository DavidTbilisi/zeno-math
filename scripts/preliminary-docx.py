"""Build the preliminary thesis as editable Word using the existing thesis reference.

Run with the bundled document Python runtime. Use --toc-from RENDER.pdf after
rendering to fill the editable contents field with verified page numbers.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import argparse
import os
import re
import subprocess
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.text.paragraph import Paragraph
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / 'docs/thesis'
OUT = DIR / 'preliminary-draft.docx'
RUNNING_TITLE = 'Skill Granularity and Mastery Estimation'
TITLE = 'The Effect of Skill Granularity on Mastery Estimation in Adaptive Learning Systems'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def el(name, **attrs):
    node = OxmlElement('w:' + name)
    for key, value in attrs.items(): node.set(qn('w:' + key), str(value))
    return node

def set_font(style, name, size):
    style.font.name = name
    style.font.size = Pt(size)
    style.font.color.rgb = RGBColor(0,0,0)
    rf=style.element.get_or_add_rPr().find(qn('w:rFonts'))
    if rf is None: rf=el('rFonts');style.element.get_or_add_rPr().append(rf)
    for key in ('ascii','hAnsi','eastAsia','cs'): rf.set(qn('w:'+key),name)
    for key in list(rf.attrib):
        if 'Theme' in key or 'theme' in key: del rf.attrib[key]

def field_run(p, kind, value=None):
    r=p.add_run()
    if kind=='instrText':
        node=el('instrText');node.set('{http://www.w3.org/XML/1998/namespace}space','preserve');node.text=value
    else: node=el('fldChar',fldCharType=kind)
    r._r.append(node)

parser=argparse.ArgumentParser()
parser.add_argument('--toc-from',type=Path)
args=parser.parse_args()
source=(DIR/'preliminary-draft.md').read_text()
entries=[(len(m[1]),m[2].strip()) for m in re.finditer(r'^(#{1,2}) ([^{\n]+)$',source,re.M)]
chapters=[title for _,title in entries]
pages={}
if args.toc_from:
    text=subprocess.check_output(['pdftotext','-layout',str(args.toc_from),'-'],text=True)
    for physical,page in enumerate(text.split('\f'),1):
        lines=[line.strip() for line in page.splitlines()]
        if physical>1:
            for title in chapters:
                if title in lines and title not in pages: pages[title]=physical
    if set(pages)!=set(chapters): raise RuntimeError(f'Missing chapter locations: {set(chapters)-set(pages)}')

# Raw Word field content is inserted after Pandoc to keep it editable.
source=re.sub(r'```\{=openxml\}.*?```', '', source, flags=re.S)
source=source.replace('<!-- docx-contents -->','PRELIMINARYCONTENTSPLACEHOLDER')
with TemporaryDirectory(prefix='.preliminary-docx-',dir=DIR) as tmp:
    staged=Path(tmp)/'source.md';staged.write_text(source)
    container=os.environ.get('CONTAINER','podman')
    subprocess.run([container,'run','--rm','-v',f'{ROOT}:/data:Z','docker.io/pandoc/latex:3.6',
        str(staged.relative_to(ROOT)),'-f','markdown','-o',str(OUT.relative_to(ROOT)),
        '--reference-doc=docs/thesis/concept-reference.docx','--resource-path=docs/thesis',
        '--lua-filter=docs/thesis/format-only.lua','--citeproc',
        '--bibliography=docs/thesis/references.bib','--bibliography=docs/thesis/preliminary-references.bib','--bibliography=docs/thesis/references-csl.yaml',
        '--csl=docs/thesis/preliminary-apa.csl','--metadata','reference-section-title=References',
        '--metadata','link-citations=true'],cwd=ROOT,check=True)

d=Document(OUT)
for name in ['Normal','Body Text','First Paragraph','Title Page','Caption','Table Caption']:
    if name in d.styles:
        style=d.styles[name];set_font(style,'Sylfaen',11)
        style.paragraph_format.line_spacing=1.5
        style.paragraph_format.space_after=Pt(6 if 'Caption' not in name else 8)
        style.paragraph_format.widow_control=True
for name,size in [('Title',16),('Heading 1',11),('Heading 2',11),('TOC Heading',11)]:
    set_font(d.styles[name],'Sylfaen',size)
    d.styles[name].font.italic=name!='Title'
    d.styles[name].paragraph_format.line_spacing=1.5
    if name in ('Heading 1','TOC Heading'):d.styles[name].paragraph_format.page_break_before=True
    d.styles[name].font.bold=False
    d.styles[name].paragraph_format.keep_with_next=True
    for node in list(d.styles[name].element.xpath('.//w:pBdr')):node.getparent().remove(node)
for style in d.styles:
    if style.type==1 and 'heading' in style.name.lower():
        style.font.color.rgb=RGBColor(0,0,0)
        for n in style.element.xpath('.//w:color'):
            for a in list(n.attrib):
                if 'theme' in a.lower(): del n.attrib[a]
# Cover is the first page, with no inherited header or page number.
for s in d.sections:
    s.different_first_page_header_footer=True
    # Pandoc may reuse one header part for both default and first-page references.
    # Give the cover its own empty part without unlinking the body's relationship.
    for ref in list(s._sectPr.findall(qn('w:headerReference'))):
        if ref.get(qn('w:type'))=='first':s._sectPr.remove(ref)
    s.first_page_header.is_linked_to_previous=False
    for p in s.first_page_header.paragraphs+s.first_page_footer.paragraphs:
        for child in list(p._p):
            if child.tag!=qn('w:pPr'):p._p.remove(child)
    for p in s.footer.paragraphs:p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    header=s.header.paragraphs[0]
    header.text=RUNNING_TITLE;header.alignment=WD_ALIGN_PARAGRAPH.RIGHT
    for run in header.runs:
        run.font.name='Sylfaen';run.font.size=Pt(8);run.font.italic=True
        run.font.color.rgb=RGBColor(0,0,0)

# Native Word TOC field, with a populated cache once the rendered page map is supplied.
placeholder=next(p for p in d.paragraphs if p.text=='PRELIMINARYCONTENTSPLACEHOLDER')
head=placeholder.insert_paragraph_before('Contents','TOC Heading')
head.paragraph_format.space_before=Pt(0)
for i,(level,title) in enumerate(entries):
    p=placeholder.insert_paragraph_before()
    p.paragraph_format.line_spacing=1;p.paragraph_format.space_after=Pt(0)
    p.paragraph_format.left_indent=Cm(0.5 if level==2 else 0)
    p.paragraph_format.tab_stops.add_tab_stop(Cm(15.8),WD_TAB_ALIGNMENT.RIGHT,WD_TAB_LEADER.DOTS)
    if i==0:
        field_run(p,'begin');field_run(p,'instrText',r' TOC \o "1-2" \u ');field_run(p,'separate')
    p.add_run(title+'\t'+str(pages.get(title,'')))
    if i==len(chapters)-1:field_run(p,'end')
placeholder._p.getparent().remove(placeholder._p)

# Explicit Georgian language and font; English and equations retain their own fonts.
for p in d.paragraphs:
    if re.search('[\u10a0-\u10ff]',p.text):
        p.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT
        if p.text=='რეზიუმე':p.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT
        for r in p.runs:
            r.font.name='Sylfaen'
            rf=r._r.get_or_add_rPr().find(qn('w:rFonts'))
            if rf is not None:
                for key in ('ascii','hAnsi','eastAsia','cs'):rf.set(qn('w:'+key),'Sylfaen')
            lang=r._r.get_or_add_rPr().find(qn('w:lang'))
            if lang is None:lang=el('lang');r._r.get_or_add_rPr().append(lang)
            lang.set(qn('w:val'),'ka-GE')
    if p.text in ('რეზიუმე','Abstract','References'):
        p.paragraph_format.space_before=Pt(0)
    if p.text in ('რეზიუმე','Abstract'):
        p._p.get_or_add_pPr().append(el('outlineLvl',val=0))
    if p.text=='References':p.paragraph_format.page_break_before=True
    if p.style.name in ('Caption','Table Caption'):
        p.paragraph_format.keep_with_next=True
    if p.style.name=='Heading 1':p.paragraph_format.page_break_before=True
    if p.style.name=='Title':
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before=Pt(20);p.paragraph_format.space_after=Pt(16)
        for node in list(p._p.xpath('.//w:pBdr')):node.getparent().remove(node)
    if p.style.name=='Title Page':
        p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after=Pt(6)
# Number captions explicitly: Word does not automatically supply Pandoc's table numbers.
caption_count=0
for p in d.paragraphs:
    if p.style.name=='Table Caption':
        caption_count+=1
        r=el('r');t=el('t');t.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
        t.text=f'Table {caption_count}. ';r.append(t)
        p._p.insert(1 if p._p.pPr is not None else 0,r)
assert caption_count==4, f'Expected four numbered captions, got {caption_count}'
# Keep numeric tables editable, readable, and within the 15.92 cm text width.
widths=[[2.2,2.0,1.5,4.8,2.0,2.4],[2.3,2.5,2.0,2.3,3.6,3.2],
        [2.3,2.3,2.0,2.0,2.0,2.1,3.2],[2.4,4.2,1.9,1.9,2.3,1.4,2.0]]
for index,t in enumerate(d.tables):
    row_widths=[1.0,7.6,7.3] if index==0 else widths[index-1]
    w=[n/sum(row_widths)*15.9 for n in row_widths]
    t.autofit=False
    for col,width in zip(t.columns,w):col.width=Cm(width)
    props=t._tbl.tblPr
    for n in list(props.findall(qn('w:tblBorders'))):props.remove(n)
    borders=el('tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):borders.append(el(edge,val='single',sz=4,color='D9D9D9'))
    props.append(borders)
    for rowindex,row in enumerate(t.rows):
        trpr=row._tr.get_or_add_trPr();trpr.append(el('cantSplit'))
        if rowindex==0:trpr.append(el('tblHeader'))
        for colindex,cell in enumerate(row.cells):
            cell.width=Cm(w[colindex]);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cp=cell._tc.get_or_add_tcPr()
            for border in list(cp.findall(qn('w:tcBorders'))):cp.remove(border)
            margins=el('tcMar')
            for edge,value in [('top',70),('bottom',70),('left',70),('right',70)]:margins.append(el(edge,w=value,type='dxa'))
            cp.append(margins)
            if rowindex==0:cp.append(el('shd',fill='EDEDED',val='clear'))
            for p in cell.paragraphs:
                p.paragraph_format.line_spacing=1.5;p.paragraph_format.space_after=Pt(0)
                p.alignment=WD_ALIGN_PARAGRAPH.LEFT
                for run in p.runs:run.font.size=Pt(11);run.font.name='Sylfaen';run.font.color.rgb=RGBColor(0,0,0)
                # Keep the table together unless it cannot fit on one page.
                p.paragraph_format.keep_with_next=rowindex==0
    following=t._tbl.getnext()
    if following is not None and following.tag==qn('w:p'):
        Paragraph(following,t._parent).paragraph_format.space_before=Pt(8)
# Start references cleanly; retain compact APA hanging indents from Pandoc.
in_refs=False
for p in d.paragraphs:
    if p.text=='References':in_refs=True;continue
    if p.style.name=='Heading 1':in_refs=False
    if in_refs:
        p.paragraph_format.line_spacing=1.5;p.paragraph_format.space_after=Pt(4)
        for run in p.runs:run.font.size=Pt(11)
for style in d.styles:
    if style.type==1 and style.name!='Title':
        set_font(style,'Sylfaen',8 if style.name=='Header' else 11)
        style.paragraph_format.alignment=WD_ALIGN_PARAGRAPH.LEFT
for p in d.paragraphs:
    if p.style.name not in ('Title','Title Page'):
        p.alignment=WD_ALIGN_PARAGRAPH.LEFT
    if p.style.name in ('Heading 1','Heading 2'):
        p.paragraph_format.line_spacing=1.5
        for r in p.runs:r.italic=True
    if p.text.startswith('Figure '):p.paragraph_format.keep_with_next=False
# Keep each graphic with its following Pandoc caption.
for p in d.paragraphs:
    if p._p.xpath('.//w:drawing'):p.paragraph_format.keep_with_next=True
settings=d.settings.element
for old in list(settings.findall(qn('w:updateFields'))):settings.remove(old)
settings.append(el('updateFields',val='true'))
d.core_properties.title=TITLE
d.core_properties.subject='Preliminary thesis draft with Georgian and English abstracts'
d.core_properties.author='Davit Tchintcharashvili'
d.save(OUT)
print(OUT)
if pages:print('Verified TOC cache:',pages)
