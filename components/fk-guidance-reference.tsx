import { fkRuleUrl, getFkRule, type FkRuleId } from "../lib/fk-guidance";

/** The model selects an allowlisted ID; all displayed guidance and links are application-owned. */
export function FkGuidanceReference({ ruleIds }: { ruleIds?: FkRuleId[] }) {
  if (!ruleIds?.length) return null;
  return <div className="guidance-references" aria-label="Vägledning från Försäkringskassan">
    {ruleIds.map((id) => {
      const rule = getFkRule(id);
      return <div key={id} className="guidance-reference">
        <a href={fkRuleUrl(id)} target="_blank" rel="noopener noreferrer" title={rule.sourceSection}>FK: {rule.title} ↗</a>
        <p>{rule.requirement}</p>
      </div>;
    })}
  </div>;
}
