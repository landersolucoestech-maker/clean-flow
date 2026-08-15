from pathlib import Path

CHANGES = {
  "apps/web/src/modules/auth/pages/AuthPage.tsx": [
    ('hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-secondary relative overflow-hidden', 'relative hidden border-r border-border bg-sidebar-background lg:flex lg:w-[42%]'),
    ('absolute inset-0 bg-[url(\'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3czLm9yZy8yMDAwL3N2ZyI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjxwYXRoIGQ9Ik0zNiAzNHY2aDZ2LTZoLTZ6bTAtMzB2Nmg2di02aC02em0wIDEwdjZoNnYtNmgtNnptMCAxMHY2aDZ2LTZoLTZ6bS0xMC0xMHY2aDZ2LTZoLTZ6bTAgMTB2Nmg2di02aC02em0wLTIwdjZoNnYtNmgtNnptMCAzMHY2aDZ2LTZoLTZ6bS0xMC0xMHY2aDZ2LTZoLTZ6bTAgMTB2Nmg2di02aC02em0wLTIwdjZoNnYtNmgtNnptMC0xMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=\')] opacity-30', 'hidden'),
    ('relative z-10 flex flex-col justify-center px-12 xl:px-20', 'relative z-10 flex flex-col justify-center px-10 xl:px-14'),
    ('flex items-center gap-3 mb-8', 'mb-6 flex items-center gap-2.5'),
    ('w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center', 'flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-accent'),
    ('w-7 h-7 text-white', 'h-4 w-4 text-sidebar-primary'),
    ('text-3xl font-bold text-white', 'text-base font-semibold tracking-wide text-sidebar-foreground'),
    ('text-4xl xl:text-5xl font-bold text-white leading-tight mb-6', 'mb-3 max-w-md text-2xl font-semibold leading-tight text-sidebar-foreground'),
    ('text-xl text-white/80 mb-8 max-w-md', 'mb-6 max-w-md text-sm leading-6 text-sidebar-foreground/70'),
    ('space-y-4', 'space-y-2.5'),
    ('gap-3 text-white/90', 'gap-2.5 text-sm text-sidebar-foreground/80'),
    ('w-6 h-6 rounded-full bg-white/20 flex items-center justify-center', 'flex h-5 w-5 items-center justify-center rounded-md bg-sidebar-accent'),
    ('absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black/20 to-transparent', 'hidden'),
    ('absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl', 'hidden'),
    ('absolute -top-20 -left-20 w-60 h-60 bg-secondary/30 rounded-full blur-3xl', 'hidden'),
    ('w-full lg:w-1/2 flex items-center justify-center p-6 bg-background', 'flex w-full items-center justify-center bg-background p-4 lg:w-[58%]'),
    ('lg:hidden flex items-center justify-center gap-3 mb-8', 'mb-5 flex items-center justify-center gap-2.5 lg:hidden'),
    ('w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center', 'flex h-8 w-8 items-center justify-center rounded-md bg-primary/10'),
    ('w-6 h-6 text-white', 'h-4 w-4 text-primary'),
    ('text-2xl font-bold text-foreground', 'text-base font-semibold text-foreground'),
    ('border-0 shadow-xl bg-card', 'border border-border bg-card shadow-none'),
    ('text-2xl font-bold', 'text-lg font-semibold'),
    ('className="w-full h-11"', 'className="w-full"'),
    ('className="w-full h-11"', 'className="w-full"'),
    ('relative my-6', 'relative my-4'),
    ('text-center text-sm text-muted-foreground mt-6', 'mt-4 text-center text-xs text-muted-foreground'),
  ],
  "apps/web/src/modules/admin/pages/AdminAuth.tsx": [
    ('min-h-screen flex relative overflow-hidden', 'relative flex min-h-screen overflow-hidden bg-slate-950'),
    ('absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950', 'absolute inset-0 bg-slate-950'),
    ('absolute inset-0 overflow-hidden', 'hidden'),
    ('absolute inset-0 opacity-[0.03]', 'hidden'),
    ('relative z-10 w-full flex flex-col items-center justify-center p-6', 'relative z-10 flex w-full flex-col items-center justify-center p-4'),
    ('absolute top-6 left-6', 'absolute left-4 top-4'),
    ('flex flex-col items-center mb-8', 'mb-5 flex flex-col items-center'),
    ('w-20 h-20 bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl shadow-purple-500/30', 'mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-violet-500/15'),
    ('w-10 h-10 text-white', 'h-4 w-4 text-violet-300'),
    ('text-3xl font-bold text-white', 'text-lg font-semibold text-white'),
    ('text-slate-400 mt-2', 'mt-1 text-xs text-slate-400'),
    ('border-0 shadow-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800', 'border border-slate-800 bg-slate-900 shadow-none'),
    ('text-xl text-white', 'text-base text-white'),
    ('space-y-5', 'space-y-3'),
    ('w-5 h-5 text-slate-500', 'h-4 w-4 text-slate-500'),
    ('pl-11 h-12', 'h-9 pl-10'),
    ('w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium shadow-lg shadow-violet-500/25 transition-all duration-300', 'w-full bg-violet-600 text-white hover:bg-violet-700'),
    ('mt-8 pt-6 border-t', 'mt-4 border-t pt-3'),
    ('text-center text-sm text-slate-500 mt-6', 'mt-4 text-center text-xs text-slate-500'),
  ],
}
changed=[]
for name,repls in CHANGES.items():
    p=Path(name); text=p.read_text(); old=text
    for a,b in repls: text=text.replace(a,b)
    if text!=old: p.write_text(text); changed.append(name)
print('AUTH_VISUAL_CHANGED',len(changed))
for x in changed: print(x)
