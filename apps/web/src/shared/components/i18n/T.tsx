import { useLanguage } from "@/contexts/useLanguage";

interface TProps {
  k: string;
}

export function T({ k }: TProps) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
