"""Render Word, populate the automatic contents field and verify stable pagination."""
from pathlib import Path
from tempfile import TemporaryDirectory
import os
import re
import shutil
import subprocess
import sys
from docx import Document

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'docs/thesis'
RENDERER=Path(os.environ.get('DOCX_RENDERER',Path.home()/'.codex/plugins/cache/openai-primary-runtime/documents/26.905.11957/skills/documents/render_docx.py'))

def page_map(pdf,titles):
    content=subprocess.check_output(['pdftotext','-layout',str(pdf),'-'],text=True)
    found={}
    for physical,page in enumerate(content.split('\f'),1):
        lines=[re.sub(r'\s+',' ',line.strip()) for line in page.splitlines() if line.strip()]
        if physical==1 or 'Contents' in lines:continue
        for title in titles:
            # A long heading may wrap onto a second or third line.
            if title not in found and any(' '.join(lines[i:i+n])==title for i in range(len(lines)) for n in (1,2,3)):
                found[title]=physical
    missing=set(titles)-set(found)
    if missing:raise RuntimeError(f'Headings missing from PDF: {missing}')
    return found

with TemporaryDirectory(prefix='preliminary-final-') as temp:
    out=Path(temp)
    for attempt in range(4):
        subprocess.run([sys.executable,str(RENDERER),str(DIR/'preliminary-draft.docx'),'--output_dir',str(out),'--emit_pdf'],check=True)
        d=Document(DIR/'preliminary-draft.docx')
        cached=[p for p in d.paragraphs if '\t' in p.text and p.paragraph_format.tab_stops and any(r.text for r in p.runs)]
        titles=[p.text.split('\t')[0] for p in cached]
        mapping=page_map(out/'preliminary-draft.pdf',titles)
        if all(p.text==p.text.split('\t')[0]+'\t'+str(mapping[p.text.split('\t')[0]]) for p in cached):
            shutil.copyfile(out/'preliminary-draft.pdf',DIR/'preliminary-draft.pdf')
            print('Verified contents and PDF:',mapping)
            break
        for p in cached:
            title=p.text.split('\t')[0]
            runs=[r for r in p.runs if r.text]
            runs[0].text=title+'\t'+str(mapping[title])
            for r in runs[1:]:r.text=''
        d.save(DIR/'preliminary-draft.docx')
    else:raise RuntimeError('Pagination did not stabilise')
    # Optional retained page images for visual QA.
    if os.environ.get('PRELIMINARY_QA_DIR'):
        shutil.copytree(out,os.environ['PRELIMINARY_QA_DIR'],dirs_exist_ok=True)
