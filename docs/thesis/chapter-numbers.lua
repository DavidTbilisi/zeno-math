-- Numbers tables and figures by chapter (Table 5.1, Figure 3.5), as the text refers to them. The chapters carry their
-- numbers in their headings ("# 5 Evaluation", "# Appendix A ...") rather than being numbered by LaTeX, so LaTeX's
-- chapter counter never moves; this sets it from each heading before the chapter starts.
function Header(h)
  if h.level ~= 1 then return nil end
  local text = pandoc.utils.stringify(h)
  local number = text:match("^(%d+)%s")
  local letter = text:match("^Appendix (%u)%s")
  local label
  if number then
    label = "\\setcounter{chapter}{" .. number .. "}\\renewcommand\\thechapter{\\arabic{chapter}}"
  elseif letter then
    label = "\\setcounter{chapter}{1}\\renewcommand\\thechapter{" .. letter .. "}"
  else
    return nil
  end
  return { pandoc.RawBlock("latex", label .. "\\setcounter{table}{0}\\setcounter{figure}{0}"), h }
end
