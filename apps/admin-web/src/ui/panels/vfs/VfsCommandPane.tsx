import { Play } from "lucide-react";
import { ToolbarButton } from "../../ToolbarButton";

type VfsCommandPaneProps = {
  command: string;
  output: string;
  onCommandChange: (command: string) => void;
  onRun: () => void;
};

export function VfsCommandPane({
  command,
  output,
  onCommandChange,
  onRun
}: VfsCommandPaneProps) {
  return (
    <div className="vfs-command-pane">
      <div className="path-bar">
        <input
          value={command}
          onChange={(event) => onCommandChange(event.target.value)}
        />
        <ToolbarButton label="Run command" icon={Play} onClick={onRun} />
      </div>
      <pre className="vfs-command-output">{output}</pre>
    </div>
  );
}
