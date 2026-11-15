# Preliminary thesis revision status

The review supplied on 15 November 2026 was applied to `preliminary-draft.md` and the Word builder. The generated PDF now comes from the same Word file, so both versions share pagination. The application code and full thesis chapters were not changed by this revision.

Implemented: automatic two-level Word contents with verified page numbers and single spacing; Sylfaen 11 and 1.5 body spacing; left alignment; italic headings; new-page chapters; empty cover header/footer; a 39-character Sylfaen 8 italic running title; separate unnumbered conclusion; approved-by wording; numbered display equations and numbered proposition references; a consolidated H1–H3/G1–G4 table; technical provenance in Appendix A; DKT, AKT and the 2023 knowledge-tracing survey in the background; two plots of existing table values; a specified ASSISTments validation plan; a separate dated web-source list; and publication-place output wherever existing bibliography records supply it.

Remaining before submission:

- Install an authorised Sylfaen font and regenerate. The DOCX specifies Sylfaen, but this environment does not contain it. The current PDF uses substitute fonts, and Word may repaginate after the actual font is installed. The build refreshes the contents from the resulting pagination.
- Complete or verify publication metadata for Fancsali et al. (2013), Pardos et al. (2008), Xu and Mostow (2012), and the publication place for Piech et al. (2015). Missing publisher/place fields were not invented. The official EDM 2013 proceedings contents confirms Fancsali's paper starts on page 35 and the next paper on page 43.
- Pinpoint pages were added for the verified DKT and AKT passages. The remaining older citations still require checking against their full texts before adding specific page locators.
- The planned ASSISTments section is a protocol, not a newly completed analysis. No simulation estimates or confidence intervals were recomputed.

New source checks: the official NeurIPS DKT paper; the authors' AKT manuscript and its publication DOI 10.1145/3394486.3403282; the ACM survey record DOI 10.1145/3569576; and the official ASSISTments 2009–2010 data page. Access date: 15 November 2026.

Build with `npm run preliminary-docx` or `npm run preliminary-pdf`. Both update the editable Word document and its matching PDF. The builders use the bundled document Python and LibreOffice runtime; `DOCX_PYTHON` and `DOCX_RENDERER` override their installation paths. Regenerate the two plot assets with `python3 scripts/preliminary-figures.py` in an environment with matplotlib.
