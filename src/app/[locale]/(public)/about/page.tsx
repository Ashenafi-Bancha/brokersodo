import { cmsRoute } from "@/components/layout/cms-page";

export const revalidate = 3600;
const route = cmsRoute("about", { ns: "about", key: "title" });
export const generateMetadata = route.generateMetadata;
export default route.Page;
