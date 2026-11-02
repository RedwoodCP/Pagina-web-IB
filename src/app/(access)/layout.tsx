import { VaultOpen } from "@/components/vault";

export default function AccessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <VaultOpen />
    </>
  );
}
