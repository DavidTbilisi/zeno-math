-- Keeps a div marked .docx only in the Word build (concept-paper.md's title page after the university's template);
-- the PDF has its own title page in raw LaTeX, which the Word writer drops by itself.
function Div(div)
  if div.classes:includes("docx") and not FORMAT:match("docx") then
    return {}
  end
end
