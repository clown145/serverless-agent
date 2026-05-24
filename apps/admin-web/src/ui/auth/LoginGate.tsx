import { useCallback, useEffect, useState, type FormEvent } from "react";
import { verifyAdminToken } from "../../auth-session";
import { LanguageMenu } from "../i18n/LanguageMenu";
import { useI18n } from "../i18n/I18nProvider";

type LoginGateProps = {
  initialToken: string;
  onAuthenticated: (token: string) => void;
};

export function LoginGate({ initialToken, onAuthenticated }: LoginGateProps) {
  const { t } = useI18n();
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<"idle" | "checking" | "failed">(
    initialToken.trim() ? "checking" : "idle"
  );

  const verifyToken = useCallback(
    async (nextToken: string) => {
      setStatus("checking");
      try {
        await verifyAdminToken(nextToken);
        onAuthenticated(nextToken.trim());
      } catch {
        setStatus("failed");
      }
    },
    [onAuthenticated]
  );

  useEffect(() => {
    const trimmed = initialToken.trim();
    if (!trimmed) {
      return;
    }

    void verifyToken(trimmed);
  }, [initialToken, verifyToken]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void verifyToken(token);
  }

  return (
    <div className="login-shell">
      <header className="login-topbar">
        <div>
          <span className="topbar-kicker">serverless-agent</span>
          <h1>{t("auth.title")}</h1>
        </div>
        <LanguageMenu />
      </header>

      <main className="login-main">
        <section className="login-panel">
          <div className="login-heading">
            <div className="brand-mark">SA</div>
            <div>
              <h2>{t("auth.heading")}</h2>
              <p>{t("auth.description")}</p>
            </div>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label>
              {t("system.adminToken")}
              <input
                autoFocus
                autoComplete="current-password"
                type="password"
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  if (status === "failed") {
                    setStatus("idle");
                  }
                }}
              />
            </label>

            {status === "failed" && <p className="login-error">{t("auth.invalidToken")}</p>}
            <button className="primary-button" disabled={status === "checking"} type="submit">
              {status === "checking" ? t("auth.checking") : t("auth.signIn")}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
