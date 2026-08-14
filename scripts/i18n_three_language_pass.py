from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def insert_catalog_lines(text: str, lines: list[str]) -> str:
    if not lines:
        return text
    marker = "} as const;"
    idx = text.rfind(marker)
    if idx < 0:
        raise RuntimeError("translation catalog closing marker not found")
    return text[:idx] + "\n" + "\n".join(lines) + "\n" + text[idx:]


# Provider: validated language, safe English fallback, document lang sync.
p = "apps/web/src/app/providers/LanguageContext.tsx"
s = read(p)
s = s.replace(
'''  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved as Language) || "en";
  });''',
'''  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return saved === "en" || saved === "pt" || saved === "es" ? saved : "en";
  });''')
s = s.replace(
'''  useEffect(() => {
    localStorage.setItem("app-language", language);
  }, [language]);''',
'''  useEffect(() => {
    localStorage.setItem("app-language", language);
    document.documentElement.lang = language === "pt" ? "pt-BR" : language === "es" ? "es" : "en";
  }, [language]);''')
s = s.replace(
'''  const t = (key: string): string => {
    return translations[language][key] || key;
  };''',
'''  const t = (key: string): string => {
    return translations[language][key] ?? translations.en[key] ?? key;
  };''')
write(p, s)

# Header metadata uses translation keys.
p = "apps/web/src/app/layout/Header.tsx"
s = read(p)
start = s.index("const pageMeta = [")
end = s.index("] as const;", start) + len("] as const;")
replacement = '''const pageMeta = [
  { match: (path: string) => path === "/", titleKey: "page.dashboard.title", descriptionKey: "page.dashboard.description", icon: Building2 },
  { match: (path: string) => path.startsWith("/schedule"), titleKey: "page.schedule.title", descriptionKey: "page.schedule.description", icon: CalendarDays },
  { match: (path: string) => path.startsWith("/crm"), titleKey: "page.crm.title", descriptionKey: "page.crm.description", icon: UsersRound },
  { match: (path: string) => path.startsWith("/transactions"), titleKey: "page.transactions.title", descriptionKey: "page.transactions.description", icon: ArrowRightLeft },
  { match: (path: string) => path.startsWith("/invoices"), titleKey: "page.invoices.title", descriptionKey: "page.invoices.description", icon: CreditCard },
  { match: (path: string) => path.startsWith("/payroll"), titleKey: "page.payroll.title", descriptionKey: "page.payroll.description", icon: WalletCards },
  { match: (path: string) => path.startsWith("/communications"), titleKey: "page.communications.title", descriptionKey: "page.communications.description", icon: MessageSquareText },
  { match: (path: string) => path.startsWith("/reports"), titleKey: "page.reports.title", descriptionKey: "page.reports.description", icon: BarChart3 },
  { match: (path: string) => path.startsWith("/settings") || path.startsWith("/integrations"), titleKey: "page.settings.title", descriptionKey: "page.settings.description", icon: SlidersHorizontal },
  { match: (path: string) => path.startsWith("/support"), titleKey: "page.support.title", descriptionKey: "page.support.description", icon: CircleHelp },
] as const;'''
s = s[:start] + replacement + s[end:]
s = s.replace(
'''  const meta = pageMeta.find((item) => item.match(pathname)) ?? {
    title: "Clean Flow",
    description: "Operations workspace.",
    icon: Building2,
  };
  const HeaderIcon = meta.icon;''',
'''  const meta = pageMeta.find((item) => item.match(pathname));
  const HeaderIcon = meta?.icon ?? Building2;
  const pageTitle = meta ? t(meta.titleKey) : "Clean Flow";
  const pageDescription = meta ? t(meta.descriptionKey) : t("page.default.description");''')
s = s.replace('{meta.title}', '{pageTitle}').replace('{meta.description}', '{pageDescription}')
write(p, s)

# Language switcher accessibility.
p = "apps/web/src/app/layout/LanguageSwitcher.tsx"
s = read(p)
s = s.replace('const { language, setLanguage } = useLanguage();', 'const { language, setLanguage, t } = useLanguage();')
s = s.replace('aria-label="Change language"', 'aria-label={t("language.change")}')
write(p, s)

# Sidebar fixed strings.
p = "apps/web/src/app/layout/Sidebar.tsx"
s = read(p)
s = s.replace('>Operations</p>', '>{t("sidebar.operations")}</p>')
s = s.replace('>Clean spaces. Better flow.</p>', '>{t("sidebar.tagline")}</p>')
write(p, s)

# CRM tabs.
p = "apps/web/src/modules/crm/components/CrmTabs.tsx"
s = read(p)
if 'from "@/contexts/useLanguage"' not in s:
    s = s.replace('import { cn } from "@/lib/utils";', 'import { cn } from "@/lib/utils";\nimport { useLanguage } from "@/contexts/useLanguage";')
s = s.replace('{ label: "Customers", href: "/crm", end: true },', '{ labelKey: "crm.tabs.customers", href: "/crm", end: true },')
s = s.replace('{ label: "Leads", href: "/crm/leads", end: false },', '{ labelKey: "crm.tabs.leads", href: "/crm/leads", end: false },')
s = s.replace('{ label: "Contacts", href: "/crm/contacts", end: false },', '{ labelKey: "crm.tabs.contacts", href: "/crm/contacts", end: false },')
s = s.replace('export function CrmTabs() {\n  return (', 'export function CrmTabs() {\n  const { t } = useLanguage();\n  return (')
s = s.replace('{tab.label}', '{t(tab.labelKey)}')
write(p, s)

catalog_keys = {
    "en": {
        "language.change":"Change language","sidebar.operations":"Operations","sidebar.tagline":"Clean spaces. Better flow.",
        "page.default.description":"Operations workspace.","page.dashboard.title":"Dashboard","page.dashboard.description":"Business overview and daily operations.",
        "page.schedule.title":"Schedule","page.schedule.description":"Jobs, appointments and team availability.","page.crm.title":"CRM","page.crm.description":"Customers, leads and business contacts.",
        "page.transactions.title":"Transactions","page.transactions.description":"Cash flow, income and expenses.","page.invoices.title":"Invoices","page.invoices.description":"Billing, payments and financial records.",
        "page.payroll.title":"Payroll","page.payroll.description":"Team compensation and payroll periods.","page.communications.title":"Communications","page.communications.description":"Unified customer conversations and channels.",
        "page.reports.title":"Reports","page.reports.description":"Operational and financial performance.","page.settings.title":"Settings","page.settings.description":"Company preferences, integrations and access.",
        "page.support.title":"Help & Support","page.support.description":"Support resources and assistance.","crm.tabs.customers":"Customers","crm.tabs.leads":"Leads","crm.tabs.contacts":"Contacts"
    },
    "pt": {
        "language.change":"Alterar idioma","sidebar.operations":"Operações","sidebar.tagline":"Espaços limpos. Fluxo melhor.",
        "page.default.description":"Central de operações.","page.dashboard.title":"Dashboard","page.dashboard.description":"Visão geral do negócio e operações do dia.",
        "page.schedule.title":"Agenda","page.schedule.description":"Serviços, compromissos e disponibilidade da equipe.","page.crm.title":"CRM","page.crm.description":"Clientes, leads e contatos comerciais.",
        "page.transactions.title":"Transações","page.transactions.description":"Fluxo de caixa, receitas e despesas.","page.invoices.title":"Faturas","page.invoices.description":"Faturamento, pagamentos e registros financeiros.",
        "page.payroll.title":"Folha de Pagamento","page.payroll.description":"Remuneração da equipe e períodos de pagamento.","page.communications.title":"Comunicações","page.communications.description":"Conversas e canais de atendimento unificados.",
        "page.reports.title":"Relatórios","page.reports.description":"Desempenho operacional e financeiro.","page.settings.title":"Configurações","page.settings.description":"Preferências da empresa, integrações e acessos.",
        "page.support.title":"Ajuda e Suporte","page.support.description":"Recursos de suporte e atendimento.","crm.tabs.customers":"Clientes","crm.tabs.leads":"Leads","crm.tabs.contacts":"Contatos"
    },
    "es": {
        "language.change":"Cambiar idioma","sidebar.operations":"Operaciones","sidebar.tagline":"Espacios limpios. Mejor flujo.",
        "page.default.description":"Centro de operaciones.","page.dashboard.title":"Panel","page.dashboard.description":"Resumen del negocio y operaciones del día.",
        "page.schedule.title":"Agenda","page.schedule.description":"Trabajos, citas y disponibilidad del equipo.","page.crm.title":"CRM","page.crm.description":"Clientes, leads y contactos comerciales.",
        "page.transactions.title":"Transacciones","page.transactions.description":"Flujo de caja, ingresos y gastos.","page.invoices.title":"Facturas","page.invoices.description":"Facturación, pagos y registros financieros.",
        "page.payroll.title":"Nómina","page.payroll.description":"Compensación del equipo y períodos de pago.","page.communications.title":"Comunicaciones","page.communications.description":"Conversaciones y canales de atención unificados.",
        "page.reports.title":"Reportes","page.reports.description":"Rendimiento operativo y financiero.","page.settings.title":"Configuración","page.settings.description":"Preferencias de la empresa, integraciones y accesos.",
        "page.support.title":"Ayuda y Soporte","page.support.description":"Recursos de soporte y asistencia.","crm.tabs.customers":"Clientes","crm.tabs.leads":"Leads","crm.tabs.contacts":"Contactos"
    },
}

for lang, items in catalog_keys.items():
    p = f"apps/web/src/app/i18n/{lang}.ts"
    s = read(p)
    existing = set(re.findall(r'^\s*"([^"]+)"\s*:', s, flags=re.M))
    lines = []
    for key, value in items.items():
        if key not in existing:
            escaped = value.replace('\\', '\\\\').replace('"', '\\"')
            lines.append(f'    "{key}": "{escaped}",')
    if lines:
        write(p, insert_catalog_lines(s, lines))

# Audit visible literals for the next pass.
roots = [Path('apps/web/src/app/layout'), Path('apps/web/src/modules')]
findings = []
pat = re.compile(r'>\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 &/+().,:;!?\-]{2,})\s*<')
allow = {'Clean Flow', 'CRM', 'SMS', 'PDF', 'QuickBooks', 'Nextdoor', 'Facebook', 'Instagram'}
for root in roots:
    for path in root.rglob('*.tsx'):
        text = path.read_text()
        for match in pat.finditer(text):
            value = ' '.join(match.group(1).split())
            if value not in allow:
                findings.append((str(path), value))
Path('i18n-visible-literals.txt').write_text('\n'.join(f'{p}: {v}' for p, v in findings))
print(f'Visible literal candidates: {len(findings)}')
