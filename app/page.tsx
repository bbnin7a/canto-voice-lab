import { App } from "../src/client/App";
import { providersResponse } from "../src/server/api";

export default function Page() {
  return <App initialProviders={providersResponse().providers} />;
}
