import { cmsRoute } from "@/components/layout/cms-page";

export const revalidate = 3600;
const route = cmsRoute("terms", { ns: "legal", key: "termsTitle" });
export const generateMetadata = route.generateMetadata;
export default route.Page;
