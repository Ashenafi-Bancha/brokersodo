import { EyeLoader } from "@/components/ui/misc";

export default function AdminLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <EyeLoader label="Loading" />
    </div>
  );
}
