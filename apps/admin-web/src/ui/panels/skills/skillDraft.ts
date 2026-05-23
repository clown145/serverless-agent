export type SkillCreateDraft = {
  skillId: string;
  name: string;
  description: string;
  body: string;
};

export const defaultSkillDraft: SkillCreateDraft = {
  skillId: "",
  name: "",
  description: "",
  body: "# Workflow\n\nDescribe when to use this skill and the exact steps to follow.\n"
};
