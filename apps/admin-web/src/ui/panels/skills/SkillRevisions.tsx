import { RotateCcw } from "lucide-react";
import type { SkillFileRevision, SkillFileRevisionDetail } from "../../../api/types";
import { EmptyState } from "../../EmptyState";
import { useI18n } from "../../i18n/I18nProvider";
import { ToolbarButton } from "../../ToolbarButton";

type SkillRevisionsProps = {
  revisions: SkillFileRevision[];
  selectedRevision?: SkillFileRevisionDetail;
  onOpenRevision: (version: number) => void;
  onRollback: (version: number) => void;
};

export function SkillRevisions({
  revisions,
  selectedRevision,
  onOpenRevision,
  onRollback
}: SkillRevisionsProps) {
  const { t } = useI18n();

  return (
    <section className="skill-revisions">
      <div className="subsection-header">
        <div>
          <h2>{t("skills.revisions")}</h2>
          <p>{t("skills.revisionsCount", { count: revisions.length })}</p>
        </div>
      </div>
      <div className="skill-revision-layout">
        <div className="item-list skill-revision-list">
          {revisions.map((revision) => (
            <button
              key={revision.id}
              className={`list-item skill-revision-item${
                selectedRevision?.version === revision.version ? " selected" : ""
              }`}
              type="button"
              onClick={() => onOpenRevision(revision.version)}
            >
              <span>v{revision.version}</span>
              <small>{revision.createdAt}</small>
              <small>{revision.createdBy}</small>
            </button>
          ))}
          {revisions.length === 0 && <EmptyState label={t("skills.noRevisions")} />}
        </div>
        <div className="skill-revision-preview">
          {selectedRevision ? (
            <>
              <div className="skill-meta-line">
                <span>v{selectedRevision.version}</span>
                {selectedRevision.size !== undefined && (
                  <span>{selectedRevision.size} bytes</span>
                )}
                {selectedRevision.mimeType && <span>{selectedRevision.mimeType}</span>}
                <ToolbarButton
                  label={t("skills.rollback")}
                  icon={RotateCcw}
                  onClick={() => onRollback(selectedRevision.version)}
                />
              </div>
              <pre>{selectedRevision.content}</pre>
            </>
          ) : (
            <EmptyState label={t("skills.selectRevision")} />
          )}
        </div>
      </div>
    </section>
  );
}
