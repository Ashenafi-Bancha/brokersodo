import { cmsRoute } from "@/components/layout/cms-page";

export const revalidate = 3600;
const route = cmsRoute("privacy", { ns: "legal", key: "privacyTitle" });
export const generateMetadata = route.generateMetadata;
export default route.Page;
