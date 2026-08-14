from pathlib import Path
import re


def load(lang):
    p=Path(f'apps/web/src/app/i18n/{lang}.ts')
    return p,p.read_text()

def append_missing(lang, mapping):
    p,s=load(lang)
    existing=set(re.findall(r'^\s*"([^"]+)"\s*:',s,flags=re.M))
    lines=[]
    for k,v in mapping.items():
        if k not in existing:
            v=v.replace('\\','\\\\').replace('"','\\"')
            lines.append(f'    "{k}": "{v}",')
    if lines:
        i=s.rfind('};')
        p.write_text(s[:i]+'\n'+'\n'.join(lines)+'\n'+s[i:])

en_extra={
'leads.frequency.biweekly':'Biweekly','leads.frequency.every_3_weeks':'Every 3 weeks','leads.frequency.every_4_weeks':'Every 4 weeks','leads.frequency.monthly':'Monthly'
}

pt={
'admin.sidebar.dashboard':'Dashboard','admin.sidebar.clients':'Empresas','admin.sidebar.auth':'Autenticação','admin.sidebar.logs':'Logs','admin.sidebar.settings':'Configurações','admin.sidebar.subscription':'Planos','admin.sidebar.support':'Suporte','admin.sidebar.exit':'Sair do Admin',
'admin.dashboard.title':'Dashboard da Plataforma','admin.dashboard.description':'Visão geral de todas as empresas e métricas da plataforma','admin.dashboard.recent_companies':'Empresas Recentes','admin.dashboard.recent_activity':'Atividade Recente','admin.dashboard.no_companies':'Nenhuma empresa cadastrada','admin.dashboard.no_activity':'Nenhuma atividade recente',
'admin.stats.companies':'Empresas','admin.stats.customers':'Total de Clientes','admin.stats.jobs':'Total de Serviços','admin.stats.invoices':'Total de Faturas','admin.stats.tickets':'Chamados de Suporte',
'admin.clients.title':'Empresas','admin.clients.description':'Gerencie todas as empresas cadastradas','admin.clients.add_company':'Adicionar Empresa','admin.clients.search_placeholder':'Buscar empresas...','admin.clients.no_companies':'Nenhuma empresa encontrada','admin.clients.company':'Empresa','admin.clients.email':'E-mail','admin.clients.country':'País','admin.clients.currency':'Moeda','admin.clients.created':'Criado em','admin.clients.status':'Status','admin.clients.active':'Ativa','admin.clients.view':'Ver','admin.clients.edit':'Editar','admin.clients.suspend':'Suspender',
'admin.auth.title':'Autenticação','admin.auth.description':'Gerencie provedores de autenticação e segurança','admin.auth.providers':'Provedores de Autenticação','admin.auth.providers_description':'Ative ou desative métodos de autenticação','admin.auth.enabled':'Ativado','admin.auth.disabled':'Desativado','admin.auth.security_settings':'Configurações de Segurança','admin.auth.security_description':'Configure opções de segurança','admin.auth.email_confirmation':'Confirmação de E-mail','admin.auth.email_confirmation_desc':'Exigir verificação de e-mail','admin.auth.mfa':'Autenticação Multifator','admin.auth.mfa_desc':'Ativar 2FA para todos os usuários','admin.auth.session_timeout':'Tempo Limite da Sessão','admin.auth.session_timeout_desc':'Encerrar sessão automaticamente após inatividade','admin.auth.platform_admins':'Administradores da Plataforma','admin.auth.platform_admins_desc':'Usuários com acesso de superadministrador','admin.auth.add_admin':'Adicionar Administrador','admin.auth.no_admins':'Nenhum administrador da plataforma configurado','admin.auth.active':'Ativo','admin.auth.inactive':'Inativo',
'admin.logs.title':'Logs da Plataforma','admin.logs.description':'Veja todos os logs de atividade da plataforma','admin.logs.search_placeholder':'Buscar logs...','admin.logs.all_actions':'Todas as Ações','admin.logs.no_logs':'Nenhum log encontrado','admin.logs.timestamp':'Data/Hora','admin.logs.action':'Ação','admin.logs.entity':'Entidade','admin.logs.details':'Detalhes','admin.logs.ip':'Endereço IP',
'admin.settings.title':'Configurações da Plataforma','admin.settings.description':'Configure as definições globais da plataforma','admin.settings.save':'Salvar Alterações','admin.settings.platform_info':'Informações da Plataforma','admin.settings.platform_name':'Nome da Plataforma','admin.settings.support_email':'E-mail de Suporte','admin.settings.default_language':'Idioma Padrão','admin.settings.notifications':'Notificações','admin.settings.new_company_alerts':'Alertas de Novas Empresas','admin.settings.new_company_alerts_desc':'Receba notificações quando novas empresas se cadastrarem','admin.settings.ticket_alerts':'Alertas de Chamados','admin.settings.ticket_alerts_desc':'Receba notificações sobre novos chamados de suporte','admin.settings.system_alerts':'Alertas do Sistema','admin.settings.system_alerts_desc':'Receba notificações sobre problemas do sistema','admin.settings.email_settings':'Configurações de E-mail','admin.settings.smtp_host':'Servidor SMTP','admin.settings.smtp_port':'Porta SMTP','admin.settings.from_email':'E-mail do Remetente','admin.settings.maintenance':'Manutenção','admin.settings.maintenance_mode':'Modo de Manutenção','admin.settings.maintenance_mode_desc':'Desativar temporariamente o acesso','admin.settings.maintenance_message':'Mensagem de Manutenção','admin.settings.maintenance_message_placeholder':'Estamos em manutenção no momento...',
'admin.subscription.title':'Planos de Assinatura','admin.subscription.description':'Gerencie planos de preços e assinaturas','admin.subscription.add_plan':'Adicionar Plano','admin.subscription.popular':'Popular','admin.subscription.active_companies':'Empresas ativas','admin.subscription.edit':'Editar','admin.subscription.revenue':'Visão Geral da Receita','admin.subscription.revenue_description':'Métricas de receita mensal e anual','admin.subscription.mrr':'MRR','admin.subscription.arr':'ARR','admin.subscription.paying_customers':'Clientes Pagantes','admin.subscription.churn_rate':'Taxa de Cancelamento',
'admin.support.title':'Chamados de Suporte','admin.support.description':'Gerencie chamados de suporte de todas as empresas','admin.support.search_placeholder':'Buscar chamados...','admin.support.all_status':'Todos os Status','admin.support.no_tickets':'Nenhum chamado encontrado','admin.support.ticket':'Chamado','admin.support.company':'Empresa','admin.support.subject':'Assunto','admin.support.priority':'Prioridade','admin.support.status':'Status','admin.support.created':'Criado em','admin.support.change_status':'Alterar status','admin.support.type_reply':'Digite sua resposta...'
}

es={
'admin.sidebar.dashboard':'Panel','admin.sidebar.clients':'Empresas','admin.sidebar.auth':'Autenticación','admin.sidebar.logs':'Registros','admin.sidebar.settings':'Configuración','admin.sidebar.subscription':'Planes','admin.sidebar.support':'Soporte','admin.sidebar.exit':'Salir de Admin',
'admin.dashboard.title':'Panel de la Plataforma','admin.dashboard.description':'Resumen de todas las empresas y métricas de la plataforma','admin.dashboard.recent_companies':'Empresas Recientes','admin.dashboard.recent_activity':'Actividad Reciente','admin.dashboard.no_companies':'No hay empresas registradas','admin.dashboard.no_activity':'No hay actividad reciente',
'admin.stats.companies':'Empresas','admin.stats.customers':'Total de Clientes','admin.stats.jobs':'Total de Trabajos','admin.stats.invoices':'Total de Facturas','admin.stats.tickets':'Tickets de Soporte',
'admin.clients.title':'Empresas','admin.clients.description':'Administra todas las empresas registradas','admin.clients.add_company':'Agregar Empresa','admin.clients.search_placeholder':'Buscar empresas...','admin.clients.no_companies':'No se encontraron empresas','admin.clients.company':'Empresa','admin.clients.email':'Correo','admin.clients.country':'País','admin.clients.currency':'Moneda','admin.clients.created':'Creado','admin.clients.status':'Estado','admin.clients.active':'Activa','admin.clients.view':'Ver','admin.clients.edit':'Editar','admin.clients.suspend':'Suspender',
'admin.auth.title':'Autenticación','admin.auth.description':'Administra proveedores de autenticación y seguridad','admin.auth.providers':'Proveedores de Autenticación','admin.auth.providers_description':'Activa o desactiva métodos de autenticación','admin.auth.enabled':'Activado','admin.auth.disabled':'Desactivado','admin.auth.security_settings':'Configuración de Seguridad','admin.auth.security_description':'Configura opciones de seguridad','admin.auth.email_confirmation':'Confirmación de Correo','admin.auth.email_confirmation_desc':'Requerir verificación de correo','admin.auth.mfa':'Autenticación Multifactor','admin.auth.mfa_desc':'Activar 2FA para todos los usuarios','admin.auth.session_timeout':'Tiempo de Sesión','admin.auth.session_timeout_desc':'Cerrar sesión automáticamente por inactividad','admin.auth.platform_admins':'Administradores de la Plataforma','admin.auth.platform_admins_desc':'Usuarios con acceso de superadministrador','admin.auth.add_admin':'Agregar Administrador','admin.auth.no_admins':'No hay administradores de plataforma configurados','admin.auth.active':'Activo','admin.auth.inactive':'Inactivo',
'admin.logs.title':'Registros de la Plataforma','admin.logs.description':'Consulta todos los registros de actividad de la plataforma','admin.logs.search_placeholder':'Buscar registros...','admin.logs.all_actions':'Todas las Acciones','admin.logs.no_logs':'No se encontraron registros','admin.logs.timestamp':'Fecha/Hora','admin.logs.action':'Acción','admin.logs.entity':'Entidad','admin.logs.details':'Detalles','admin.logs.ip':'Dirección IP',
'admin.settings.title':'Configuración de la Plataforma','admin.settings.description':'Configura los ajustes globales de la plataforma','admin.settings.save':'Guardar Cambios','admin.settings.platform_info':'Información de la Plataforma','admin.settings.platform_name':'Nombre de la Plataforma','admin.settings.support_email':'Correo de Soporte','admin.settings.default_language':'Idioma Predeterminado','admin.settings.notifications':'Notificaciones','admin.settings.new_company_alerts':'Alertas de Nuevas Empresas','admin.settings.new_company_alerts_desc':'Recibe avisos cuando se registren nuevas empresas','admin.settings.ticket_alerts':'Alertas de Tickets','admin.settings.ticket_alerts_desc':'Recibe avisos sobre nuevos tickets de soporte','admin.settings.system_alerts':'Alertas del Sistema','admin.settings.system_alerts_desc':'Recibe avisos sobre problemas del sistema','admin.settings.email_settings':'Configuración de Correo','admin.settings.smtp_host':'Servidor SMTP','admin.settings.smtp_port':'Puerto SMTP','admin.settings.from_email':'Correo del Remitente','admin.settings.maintenance':'Mantenimiento','admin.settings.maintenance_mode':'Modo de Mantenimiento','admin.settings.maintenance_mode_desc':'Desactivar temporalmente el acceso','admin.settings.maintenance_message':'Mensaje de Mantenimiento','admin.settings.maintenance_message_placeholder':'Estamos en mantenimiento en este momento...',
'admin.subscription.title':'Planes de Suscripción','admin.subscription.description':'Administra planes de precios y suscripciones','admin.subscription.add_plan':'Agregar Plan','admin.subscription.popular':'Popular','admin.subscription.active_companies':'Empresas activas','admin.subscription.edit':'Editar','admin.subscription.revenue':'Resumen de Ingresos','admin.subscription.revenue_description':'Métricas de ingresos mensuales y anuales','admin.subscription.mrr':'MRR','admin.subscription.arr':'ARR','admin.subscription.paying_customers':'Clientes de Pago','admin.subscription.churn_rate':'Tasa de Cancelación',
'admin.support.title':'Tickets de Soporte','admin.support.description':'Administra tickets de soporte de todas las empresas','admin.support.search_placeholder':'Buscar tickets...','admin.support.all_status':'Todos los Estados','admin.support.no_tickets':'No se encontraron tickets','admin.support.ticket':'Ticket','admin.support.company':'Empresa','admin.support.subject':'Asunto','admin.support.priority':'Prioridad','admin.support.status':'Estado','admin.support.created':'Creado','admin.support.change_status':'Cambiar estado','admin.support.type_reply':'Escribe tu respuesta...'
}

append_missing('en',en_extra)
append_missing('pt',pt)
append_missing('es',es)

# Verify parity locally and fail if anything remains.
sets={}
for lang in ('en','pt','es'):
    _,s=load(lang)
    sets[lang]=set(re.findall(r'^\s*"([^"]+)"\s*:',s,flags=re.M))
all_keys=sets['en']|sets['pt']|sets['es']
for lang in ('en','pt','es'):
    missing=all_keys-sets[lang]
    if missing:
        raise SystemExit(f'{lang} still missing {len(missing)} keys: {sorted(missing)}')
print(f'PASS parity: {len(all_keys)} keys in en/pt/es')
