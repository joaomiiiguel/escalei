import { Button } from "./button";
export function InstallBanner({ onInstall }: { onInstall?: () => void }) { return <aside className="ui-install-banner"><span aria-hidden="true">▣</span><div><b>Instale o Escalei</b><small>Jogue direto da tela inicial.</small></div>{onInstall && <Button type="button" variant="ghost" onClick={onInstall}>Instalar</Button>}</aside>; }
