-- Numbers tables and figures by chapter (Table 3.1, Figure 2.5), as the text refers to them. The chapters carry their
-- numbers in their headings ("# 2 Method", "# Appendix A ...") rather than being numbered by LaTeX, so LaTeX's chapter
-- counter never moves; this sets it from each heading before the chapter starts. The introduction and the conclusion
-- are not numbered chapters, so their tables and figures are numbered plainly (Figure 1) and start again from 1.
function Header(h)
  if h.level ~= 1 then return nil end
  local text = pandoc.utils.stringify(h)
  local number = text:match("^(%d+)%s")
  local letter = text:match("^Appendix (%u)%s")
  local label
  if number then
    label = "\\setcounter{chapter}{" .. number .. "}\\renewcommand\\thechapter{\\arabic{chapter}}"
      .. "\\renewcommand\\thetable{\\thechapter.\\arabic{table}}\\renewcommand\\thefigure{\\thechapter.\\arabic{figure}}"
  elseif letter then
    label = "\\setcounter{chapter}{1}\\renewcommand\\thechapter{" .. letter .. "}"
      .. "\\renewcommand\\thetable{\\thechapter.\\arabic{table}}\\renewcommand\\thefigure{\\thechapter.\\arabic{figure}}"
  else
    label = "\\renewcommand\\thetable{\\arabic{table}}\\renewcommand\\thefigure{\\arabic{figure}}"
  end
  return { pandoc.RawBlock("latex", label .. "\\setcounter{table}{0}\\setcounter{figure}{0}"), h }
end
