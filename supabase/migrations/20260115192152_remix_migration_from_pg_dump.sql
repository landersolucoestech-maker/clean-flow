CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'cleaner',
    'driver',
    'cleaning_manager',
    'office_manager',
    'virtual_assistant'
);


--
-- Name: ticket_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_category AS ENUM (
    'billing',
    'technical',
    'feature_request',
    'general',
    'account',
    'integration'
);


--
-- Name: ticket_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: ticket_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ticket_status AS ENUM (
    'open',
    'in_progress',
    'waiting_customer',
    'resolved',
    'closed'
);


--
-- Name: can_edit_job_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_edit_job_status(staff_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_roles sr
    WHERE sr.staff_id = $1
      AND sr.role IN ('admin', 'virtual_assistant', 'office_manager', 'cleaning_manager')
  )
$_$;


--
-- Name: can_trigger_job_status(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_trigger_job_status(staff_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.id = $1 AND s.is_active = true
  )
$_$;


--
-- Name: deduplicate_staff_assigned(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduplicate_staff_assigned() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Remove duplicates from staff_assigned array
  IF NEW.staff_assigned IS NOT NULL THEN
    NEW.staff_assigned := ARRAY(
      SELECT DISTINCT unnest(NEW.staff_assigned)
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_ticket_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_ticket_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 8) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.support_tickets
  WHERE company_id = NEW.company_id;
  
  NEW.ticket_number := 'TICKET-' || LPAD(next_num::TEXT, 6, '0');
  RETURN NEW;
END;
$$;


--
-- Name: is_platform_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_platform_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;


--
-- Name: update_ticket_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ticket_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: automation_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trigger_type text NOT NULL,
    label text NOT NULL,
    category text DEFAULT 'job'::text NOT NULL,
    delay_type text,
    delay_value integer,
    send_at_time text,
    condition text,
    action text DEFAULT 'send_message'::text NOT NULL,
    message_to text DEFAULT 'text_phone_1'::text NOT NULL,
    message text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: automation_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.automation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    automation_id uuid,
    job_id uuid,
    customer_id uuid,
    invoice_id uuid,
    trigger_type text NOT NULL,
    message_sent text,
    sent_to text,
    sent_via text DEFAULT 'sms'::text,
    status text DEFAULT 'sent'::text,
    error_message text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: broadcast_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message text,
    status text DEFAULT 'pending'::text NOT NULL,
    total_recipients integer DEFAULT 0 NOT NULL,
    sent_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    customer_filter jsonb,
    attachment_urls text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    completed_at timestamp with time zone
);


--
-- Name: broadcast_recipients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.broadcast_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    broadcast_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    phone text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp with time zone,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_name text DEFAULT ''::text NOT NULL,
    trade_name text DEFAULT ''::text NOT NULL,
    tax_id text DEFAULT ''::text,
    country text DEFAULT 'US'::text,
    currency text DEFAULT 'USD'::text,
    timezone text DEFAULT 'America/New_York'::text,
    locale text DEFAULT 'en-US'::text,
    date_format text DEFAULT 'MM/DD/YYYY'::text,
    email text DEFAULT ''::text,
    phone text DEFAULT ''::text,
    address text DEFAULT ''::text,
    logo_url text DEFAULT ''::text,
    business_hours jsonb DEFAULT '[{"day": "Monday", "open": "08:00", "close": "18:00", "isOpen": true}, {"day": "Tuesday", "open": "08:00", "close": "18:00", "isOpen": true}, {"day": "Wednesday", "open": "08:00", "close": "18:00", "isOpen": true}, {"day": "Thursday", "open": "08:00", "close": "18:00", "isOpen": true}, {"day": "Friday", "open": "08:00", "close": "18:00", "isOpen": true}, {"day": "Saturday", "open": "09:00", "close": "16:00", "isOpen": true}, {"day": "Sunday", "open": "00:00", "close": "00:00", "isOpen": false}]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_review_url text,
    nextdoor_review_url text,
    review_delay_minutes integer DEFAULT 120,
    review_trigger text DEFAULT 'time_after_finished'::text,
    review_delay_type text DEFAULT 'hours'::text,
    review_message_to text DEFAULT 'text_phone_1'::text,
    preferred_language text DEFAULT 'en'::text,
    gps_distance_threshold integer DEFAULT 500,
    gps_alert_sms_enabled boolean DEFAULT false,
    gps_alert_sms_to text,
    zelle_payment_key text,
    venmo_payment_key text
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    last_message text,
    last_message_at timestamp with time zone DEFAULT now(),
    unread boolean DEFAULT false NOT NULL,
    favorite boolean DEFAULT false NOT NULL,
    archived boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    staff_id uuid,
    CONSTRAINT conversation_has_recipient CHECK (((customer_id IS NOT NULL) OR (staff_id IS NOT NULL)))
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    name text DEFAULT 'Home'::text NOT NULL,
    address text NOT NULL,
    notes text,
    additional_notes text,
    frequency text DEFAULT 'weekly'::text,
    preferred_day text DEFAULT 'monday'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    street text,
    complement text,
    city text,
    state text,
    postal_code text
);


--
-- Name: customer_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_relationships (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid,
    start_date date NOT NULL,
    end_date date,
    end_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    term_name text DEFAULT 'Terms & Conditions'::text NOT NULL,
    term_description text DEFAULT 'Service Agreement'::text,
    signed_by text NOT NULL,
    signed_at timestamp with time zone DEFAULT now() NOT NULL,
    signature_text text,
    ip_address text,
    document_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    city text,
    state text,
    zip_code text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone2 text,
    status text DEFAULT 'Active'::text,
    frequency text DEFAULT 'weekly'::text,
    preferred_day text DEFAULT 'monday'::text,
    payment_method text DEFAULT 'quickbooks'::text,
    customer_since date DEFAULT CURRENT_DATE,
    last_service date,
    total_jobs integer DEFAULT 0,
    revenue numeric(10,2) DEFAULT 0,
    rating integer DEFAULT 5,
    additional_info text,
    source text,
    payment_terms text DEFAULT 'net_30'::text,
    billing_contact_name text,
    billing_contact_relationship text,
    billing_contact_email text,
    billing_contact_phone text,
    billing_contact_phone2 text,
    billing_contact_notes text,
    preferred_language text
);


--
-- Name: invoice_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    email_to text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    job_id uuid,
    lead_id uuid,
    invoice_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    issue_date date DEFAULT CURRENT_DATE,
    due_date date,
    subtotal numeric(10,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    amount_paid numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    qb_invoice_id text,
    qb_doc_number text,
    qb_email_status text,
    qb_balance numeric DEFAULT 0,
    qb_synced_at timestamp with time zone,
    auto_generated boolean DEFAULT false,
    reminder_sent_at timestamp with time zone,
    overdue_reminder_sent_at timestamp with time zone,
    created_by text,
    invoice_type text DEFAULT 'standard'::text NOT NULL,
    CONSTRAINT invoices_invoice_type_check CHECK ((invoice_type = ANY (ARRAY['deposit'::text, 'balance'::text, 'standard'::text])))
);


--
-- Name: job_status_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_status_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    status_type text NOT NULL,
    triggered_by uuid,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    latitude numeric(10,8),
    longitude numeric(11,8),
    accuracy_meters numeric(10,2),
    address_resolved text,
    device_info jsonb,
    is_manual_edit boolean DEFAULT false,
    edited_by uuid,
    edited_at timestamp with time zone,
    previous_value timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    distance_from_job integer,
    CONSTRAINT job_status_tracking_status_type_check CHECK ((status_type = ANY (ARRAY['on_our_way'::text, 'cleaning_now'::text, 'cleaning_done'::text])))
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    service_type text,
    status text DEFAULT 'scheduled'::text NOT NULL,
    scheduled_date date,
    scheduled_time time without time zone,
    duration_minutes integer,
    amount numeric(10,2),
    staff_assigned text[],
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    additional_notes text,
    duration_text text,
    frequency text DEFAULT 'one-time'::text,
    feedback text,
    time_started time without time zone,
    time_finished time without time zone,
    payment_status text DEFAULT 'Pending'::text,
    invoice_status text DEFAULT 'Not Generated'::text,
    on_our_way_time time without time zone,
    created_by text,
    lead_id uuid
);


--
-- Name: lead_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    address text NOT NULL,
    street text,
    city text,
    state text,
    postal_code text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text DEFAULT 'Home'::text
);


--
-- Name: lead_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lead_id uuid NOT NULL,
    interaction_type text DEFAULT 'call'::text NOT NULL,
    description text,
    interaction_date timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id uuid NOT NULL,
    estimate_number text NOT NULL,
    title text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    valid_until date,
    subtotal numeric(10,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    phone text,
    phone2 text,
    origin text,
    has_job boolean DEFAULT false,
    address text,
    preferred_days text[] DEFAULT '{}'::text[],
    preferred_time text,
    frequency text,
    service_type text,
    service_areas text[] DEFAULT '{}'::text[],
    referral_customer_id uuid,
    referral_name text,
    visit_date date,
    estimate_approved boolean DEFAULT false,
    estimate_approved_at timestamp with time zone,
    invoice_paid boolean DEFAULT false,
    invoice_paid_at timestamp with time zone,
    agreed_amount numeric DEFAULT 0,
    property_type text,
    residence_type text,
    square_feet integer,
    bedrooms integer,
    bathrooms numeric,
    has_pets boolean DEFAULT false,
    add_on_services text[] DEFAULT '{}'::text[],
    business_name text,
    tags text[] DEFAULT '{}'::text[],
    additional_notes text,
    special_instructions text
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    content text NOT NULL,
    sender_type text DEFAULT 'user'::text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attachment_url text
);


--
-- Name: payroll_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    employee_name text NOT NULL,
    staff_id uuid,
    cleaning_type text,
    client text,
    base_value numeric DEFAULT 0 NOT NULL,
    bonus numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    payment_type text DEFAULT 'Direct Deposit'::text NOT NULL,
    status text DEFAULT 'Pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    job_id uuid,
    CONSTRAINT payroll_records_status_check CHECK ((status = ANY (ARRAY['Pending'::text, 'Paid'::text, 'Overdue'::text])))
);


--
-- Name: payroll_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payroll_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    base_value numeric DEFAULT 0 NOT NULL,
    extra_value numeric DEFAULT 0 NOT NULL,
    bonus_weekly numeric DEFAULT 0 NOT NULL,
    bonus_monthly numeric DEFAULT 0 NOT NULL,
    bonus_yearly_1 numeric DEFAULT 0 NOT NULL,
    bonus_yearly_2 numeric DEFAULT 0 NOT NULL,
    bonus_performance numeric DEFAULT 0 NOT NULL,
    bonus_christmas numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text NOT NULL,
    name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: platform_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: review_request_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_request_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    message text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    sms_sent boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ringcentral_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ringcentral_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_expires_at timestamp with time zone NOT NULL,
    phone_number text,
    extension_id text,
    account_id text,
    connected_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    is_driver boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    team text,
    payment_method text DEFAULT 'zelle'::text,
    zelle_key text,
    quickbooks_vendor_id text
);


--
-- Name: staff_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_roles (
    staff_id uuid NOT NULL,
    role public.app_role DEFAULT 'cleaner'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid,
    is_staff_reply boolean DEFAULT false NOT NULL,
    message text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    ticket_number text NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status public.ticket_status DEFAULT 'open'::public.ticket_status NOT NULL,
    priority public.ticket_priority DEFAULT 'medium'::public.ticket_priority NOT NULL,
    category public.ticket_category DEFAULT 'general'::public.ticket_category NOT NULL,
    assigned_to text,
    resolved_at timestamp with time zone,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transaction_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transaction_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    condition text NOT NULL,
    category text NOT NULL,
    type text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transaction_rules_type_check CHECK ((type = ANY (ARRAY['receita'::text, 'despesa'::text])))
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    date date DEFAULT CURRENT_DATE NOT NULL,
    category text NOT NULL,
    status text DEFAULT 'pendente'::text NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    type text NOT NULL,
    service_type text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transactions_type_check CHECK ((type = ANY (ARRAY['receita'::text, 'despesa'::text])))
);


--
-- Name: automation_configs automation_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_configs
    ADD CONSTRAINT automation_configs_pkey PRIMARY KEY (id);


--
-- Name: automation_logs automation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_pkey PRIMARY KEY (id);


--
-- Name: broadcast_messages broadcast_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_messages
    ADD CONSTRAINT broadcast_messages_pkey PRIMARY KEY (id);


--
-- Name: broadcast_recipients broadcast_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customer_relationships customer_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_relationships
    ADD CONSTRAINT customer_relationships_pkey PRIMARY KEY (id);


--
-- Name: customer_terms customer_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_terms
    ADD CONSTRAINT customer_terms_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: leads estimates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT estimates_pkey PRIMARY KEY (id);


--
-- Name: invoice_reminders invoice_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_reminders
    ADD CONSTRAINT invoice_reminders_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: job_status_tracking job_status_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status_tracking
    ADD CONSTRAINT job_status_tracking_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: lead_addresses lead_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_addresses
    ADD CONSTRAINT lead_addresses_pkey PRIMARY KEY (id);


--
-- Name: lead_interactions lead_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: payroll_records payroll_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_pkey PRIMARY KEY (id);


--
-- Name: payroll_rules payroll_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_rules
    ADD CONSTRAINT payroll_rules_pkey PRIMARY KEY (id);


--
-- Name: payroll_rules payroll_rules_staff_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_rules
    ADD CONSTRAINT payroll_rules_staff_id_key UNIQUE (staff_id);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_key UNIQUE (user_id);


--
-- Name: platform_logs platform_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_logs
    ADD CONSTRAINT platform_logs_pkey PRIMARY KEY (id);


--
-- Name: review_request_logs review_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_request_logs
    ADD CONSTRAINT review_request_logs_pkey PRIMARY KEY (id);


--
-- Name: ringcentral_connections ringcentral_connections_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ringcentral_connections
    ADD CONSTRAINT ringcentral_connections_company_id_key UNIQUE (company_id);


--
-- Name: ringcentral_connections ringcentral_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ringcentral_connections
    ADD CONSTRAINT ringcentral_connections_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: staff staff_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_name_key UNIQUE (name);


--
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (id);


--
-- Name: staff_roles staff_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_pkey PRIMARY KEY (staff_id);


--
-- Name: support_ticket_messages support_ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_company_id_ticket_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_company_id_ticket_number_key UNIQUE (company_id, ticket_number);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: transaction_rules transaction_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transaction_rules
    ADD CONSTRAINT transaction_rules_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: automation_configs unique_trigger_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_configs
    ADD CONSTRAINT unique_trigger_type UNIQUE (trigger_type);


--
-- Name: idx_automation_logs_automation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_logs_automation_id ON public.automation_logs USING btree (automation_id);


--
-- Name: idx_automation_logs_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_logs_job_id ON public.automation_logs USING btree (job_id);


--
-- Name: idx_automation_logs_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_automation_logs_sent_at ON public.automation_logs USING btree (sent_at DESC);


--
-- Name: idx_broadcast_recipients_broadcast_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_broadcast_recipients_broadcast_id ON public.broadcast_recipients USING btree (broadcast_id);


--
-- Name: idx_conversations_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_staff_id ON public.conversations USING btree (staff_id) WHERE (staff_id IS NOT NULL);


--
-- Name: idx_customer_relationships_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_relationships_customer_id ON public.customer_relationships USING btree (customer_id);


--
-- Name: idx_invoices_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (due_date);


--
-- Name: idx_invoices_job_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_job_id_type ON public.invoices USING btree (job_id, invoice_type);


--
-- Name: idx_invoices_lead_id_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_lead_id_type ON public.invoices USING btree (lead_id, invoice_type);


--
-- Name: idx_invoices_qb_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_qb_invoice_id ON public.invoices USING btree (qb_invoice_id);


--
-- Name: idx_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);


--
-- Name: idx_job_status_tracking_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status_tracking_job_id ON public.job_status_tracking USING btree (job_id);


--
-- Name: idx_job_status_tracking_status_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status_tracking_status_type ON public.job_status_tracking USING btree (status_type);


--
-- Name: idx_job_status_tracking_triggered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status_tracking_triggered_at ON public.job_status_tracking USING btree (triggered_at);


--
-- Name: idx_jobs_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_lead_id ON public.jobs USING btree (lead_id);


--
-- Name: idx_payroll_records_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payroll_records_job_id ON public.payroll_records USING btree (job_id);


--
-- Name: idx_platform_admins_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admins_email ON public.platform_admins USING btree (email);


--
-- Name: idx_platform_admins_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_admins_user_id ON public.platform_admins USING btree (user_id);


--
-- Name: idx_platform_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_logs_action ON public.platform_logs USING btree (action);


--
-- Name: idx_platform_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_logs_admin_id ON public.platform_logs USING btree (admin_id);


--
-- Name: idx_platform_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_logs_created_at ON public.platform_logs USING btree (created_at DESC);


--
-- Name: idx_review_request_logs_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_review_request_logs_customer_id ON public.review_request_logs USING btree (customer_id);


--
-- Name: idx_review_request_logs_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_review_request_logs_job_id ON public.review_request_logs USING btree (job_id);


--
-- Name: idx_staff_roles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_roles_role ON public.staff_roles USING btree (role);


--
-- Name: idx_support_ticket_messages_ticket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_ticket_messages_ticket_id ON public.support_ticket_messages USING btree (ticket_id);


--
-- Name: idx_support_tickets_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_company_id ON public.support_tickets USING btree (company_id);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);


--
-- Name: messages_conversation_created_content_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX messages_conversation_created_content_unique ON public.messages USING btree (conversation_id, created_at, content);


--
-- Name: unique_invoice_transaction; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_invoice_transaction ON public.transactions USING btree ("substring"(notes, 'Invoice ID: ([a-f0-9-]+)'::text)) WHERE (notes ~~ 'Invoice ID:%'::text);


--
-- Name: jobs deduplicate_staff_assigned_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER deduplicate_staff_assigned_trigger BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.deduplicate_staff_assigned();


--
-- Name: support_tickets set_ticket_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();


--
-- Name: automation_configs update_automation_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_automation_configs_updated_at BEFORE UPDATE ON public.automation_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_settings update_company_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversations update_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_addresses update_customer_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_relationships update_customer_relationships_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_relationships_updated_at BEFORE UPDATE ON public.customer_relationships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_terms update_customer_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_terms_updated_at BEFORE UPDATE ON public.customer_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leads update_estimates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoices update_invoices_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_status_tracking update_job_status_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_job_status_tracking_updated_at BEFORE UPDATE ON public.job_status_tracking FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: jobs update_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_addresses update_lead_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_addresses_updated_at BEFORE UPDATE ON public.lead_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lead_interactions update_lead_interactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lead_interactions_updated_at BEFORE UPDATE ON public.lead_interactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_records update_payroll_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payroll_records_updated_at BEFORE UPDATE ON public.payroll_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payroll_rules update_payroll_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payroll_rules_updated_at BEFORE UPDATE ON public.payroll_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_admins update_platform_admins_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_admins_timestamp BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ringcentral_connections update_ringcentral_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ringcentral_connections_updated_at BEFORE UPDATE ON public.ringcentral_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: roles update_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_roles update_staff_roles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_roles_updated_at BEFORE UPDATE ON public.staff_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff update_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: support_tickets update_support_tickets_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_support_tickets_timestamp BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timestamp();


--
-- Name: transaction_rules update_transaction_rules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transaction_rules_updated_at BEFORE UPDATE ON public.transaction_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: automation_logs automation_logs_automation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_automation_id_fkey FOREIGN KEY (automation_id) REFERENCES public.automation_configs(id) ON DELETE SET NULL;


--
-- Name: automation_logs automation_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: automation_logs automation_logs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;


--
-- Name: automation_logs automation_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.automation_logs
    ADD CONSTRAINT automation_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: broadcast_recipients broadcast_recipients_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcast_messages(id) ON DELETE CASCADE;


--
-- Name: broadcast_recipients broadcast_recipients_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: customer_relationships customer_relationships_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_relationships
    ADD CONSTRAINT customer_relationships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: customer_terms customer_terms_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_terms
    ADD CONSTRAINT customer_terms_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: leads estimates_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT estimates_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: invoice_reminders invoice_reminders_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_reminders
    ADD CONSTRAINT invoice_reminders_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_estimate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_estimate_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: job_status_tracking job_status_tracking_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status_tracking
    ADD CONSTRAINT job_status_tracking_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES public.staff(id);


--
-- Name: job_status_tracking job_status_tracking_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status_tracking
    ADD CONSTRAINT job_status_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_status_tracking job_status_tracking_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_status_tracking
    ADD CONSTRAINT job_status_tracking_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.staff(id);


--
-- Name: jobs jobs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: lead_addresses lead_addresses_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_addresses
    ADD CONSTRAINT lead_addresses_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: lead_interactions lead_interactions_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_interactions
    ADD CONSTRAINT lead_interactions_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_referral_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_referral_customer_id_fkey FOREIGN KEY (referral_customer_id) REFERENCES public.customers(id);


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: payroll_records payroll_records_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_records
    ADD CONSTRAINT payroll_records_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id);


--
-- Name: payroll_rules payroll_rules_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payroll_rules
    ADD CONSTRAINT payroll_rules_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: platform_logs platform_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_logs
    ADD CONSTRAINT platform_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.platform_admins(id) ON DELETE SET NULL;


--
-- Name: review_request_logs review_request_logs_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_request_logs
    ADD CONSTRAINT review_request_logs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: review_request_logs review_request_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_request_logs
    ADD CONSTRAINT review_request_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: ringcentral_connections ringcentral_connections_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ringcentral_connections
    ADD CONSTRAINT ringcentral_connections_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE CASCADE;


--
-- Name: staff_roles staff_roles_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_roles
    ADD CONSTRAINT staff_roles_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;


--
-- Name: support_ticket_messages support_ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_ticket_messages
    ADD CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company_settings(id) ON DELETE CASCADE;


--
-- Name: broadcast_messages Allow all access to broadcast_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to broadcast_messages" ON public.broadcast_messages USING (true) WITH CHECK (true);


--
-- Name: broadcast_recipients Allow all access to broadcast_recipients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all access to broadcast_recipients" ON public.broadcast_recipients USING (true) WITH CHECK (true);


--
-- Name: review_request_logs Allow all operations for review request logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow all operations for review request logs" ON public.review_request_logs USING (true) WITH CHECK (true);


--
-- Name: conversations Allow public delete conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete conversations" ON public.conversations FOR DELETE USING (true);


--
-- Name: customer_addresses Allow public delete customer_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete customer_addresses" ON public.customer_addresses FOR DELETE USING (true);


--
-- Name: customer_relationships Allow public delete customer_relationships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete customer_relationships" ON public.customer_relationships FOR DELETE USING (true);


--
-- Name: customer_terms Allow public delete customer_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete customer_terms" ON public.customer_terms FOR DELETE USING (true);


--
-- Name: customers Allow public delete customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete customers" ON public.customers FOR DELETE USING (true);


--
-- Name: leads Allow public delete estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete estimates" ON public.leads FOR DELETE USING (true);


--
-- Name: invoice_reminders Allow public delete invoice_reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete invoice_reminders" ON public.invoice_reminders FOR DELETE USING (true);


--
-- Name: invoices Allow public delete invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete invoices" ON public.invoices FOR DELETE USING (true);


--
-- Name: jobs Allow public delete jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete jobs" ON public.jobs FOR DELETE USING (true);


--
-- Name: lead_addresses Allow public delete lead_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete lead_addresses" ON public.lead_addresses FOR DELETE USING (true);


--
-- Name: lead_interactions Allow public delete lead_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete lead_interactions" ON public.lead_interactions FOR DELETE USING (true);


--
-- Name: messages Allow public delete messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete messages" ON public.messages FOR DELETE USING (true);


--
-- Name: payroll_records Allow public delete payroll_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete payroll_records" ON public.payroll_records FOR DELETE USING (true);


--
-- Name: payroll_rules Allow public delete payroll_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete payroll_rules" ON public.payroll_rules FOR DELETE USING (true);


--
-- Name: roles Allow public delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete roles" ON public.roles FOR DELETE USING (true);


--
-- Name: staff Allow public delete staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete staff" ON public.staff FOR DELETE USING (true);


--
-- Name: staff_roles Allow public delete staff_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete staff_roles" ON public.staff_roles FOR DELETE USING (true);


--
-- Name: transaction_rules Allow public delete transaction_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete transaction_rules" ON public.transaction_rules FOR DELETE USING (true);


--
-- Name: transactions Allow public delete transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete transactions" ON public.transactions FOR DELETE USING (true);


--
-- Name: company_settings Allow public insert company_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert company_settings" ON public.company_settings FOR INSERT WITH CHECK (true);


--
-- Name: conversations Allow public insert conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert conversations" ON public.conversations FOR INSERT WITH CHECK (true);


--
-- Name: customer_addresses Allow public insert customer_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert customer_addresses" ON public.customer_addresses FOR INSERT WITH CHECK (true);


--
-- Name: customer_relationships Allow public insert customer_relationships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert customer_relationships" ON public.customer_relationships FOR INSERT WITH CHECK (true);


--
-- Name: customer_terms Allow public insert customer_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert customer_terms" ON public.customer_terms FOR INSERT WITH CHECK (true);


--
-- Name: customers Allow public insert customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert customers" ON public.customers FOR INSERT WITH CHECK (true);


--
-- Name: leads Allow public insert estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert estimates" ON public.leads FOR INSERT WITH CHECK (true);


--
-- Name: invoice_reminders Allow public insert invoice_reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert invoice_reminders" ON public.invoice_reminders FOR INSERT WITH CHECK (true);


--
-- Name: invoices Allow public insert invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert invoices" ON public.invoices FOR INSERT WITH CHECK (true);


--
-- Name: jobs Allow public insert jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert jobs" ON public.jobs FOR INSERT WITH CHECK (true);


--
-- Name: lead_addresses Allow public insert lead_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert lead_addresses" ON public.lead_addresses FOR INSERT WITH CHECK (true);


--
-- Name: lead_interactions Allow public insert lead_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert lead_interactions" ON public.lead_interactions FOR INSERT WITH CHECK (true);


--
-- Name: messages Allow public insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert messages" ON public.messages FOR INSERT WITH CHECK (true);


--
-- Name: payroll_records Allow public insert payroll_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert payroll_records" ON public.payroll_records FOR INSERT WITH CHECK (true);


--
-- Name: payroll_rules Allow public insert payroll_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert payroll_rules" ON public.payroll_rules FOR INSERT WITH CHECK (true);


--
-- Name: roles Allow public insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert roles" ON public.roles FOR INSERT WITH CHECK (true);


--
-- Name: staff Allow public insert staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert staff" ON public.staff FOR INSERT WITH CHECK (true);


--
-- Name: staff_roles Allow public insert staff_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert staff_roles" ON public.staff_roles FOR INSERT WITH CHECK (true);


--
-- Name: transaction_rules Allow public insert transaction_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert transaction_rules" ON public.transaction_rules FOR INSERT WITH CHECK (true);


--
-- Name: transactions Allow public insert transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);


--
-- Name: company_settings Allow public read company_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read company_settings" ON public.company_settings FOR SELECT USING (true);


--
-- Name: conversations Allow public read conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read conversations" ON public.conversations FOR SELECT USING (true);


--
-- Name: customer_addresses Allow public read customer_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read customer_addresses" ON public.customer_addresses FOR SELECT USING (true);


--
-- Name: customer_relationships Allow public read customer_relationships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read customer_relationships" ON public.customer_relationships FOR SELECT USING (true);


--
-- Name: customer_terms Allow public read customer_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read customer_terms" ON public.customer_terms FOR SELECT USING (true);


--
-- Name: customers Allow public read customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read customers" ON public.customers FOR SELECT USING (true);


--
-- Name: leads Allow public read estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read estimates" ON public.leads FOR SELECT USING (true);


--
-- Name: invoice_reminders Allow public read invoice_reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read invoice_reminders" ON public.invoice_reminders FOR SELECT USING (true);


--
-- Name: invoices Allow public read invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read invoices" ON public.invoices FOR SELECT USING (true);


--
-- Name: jobs Allow public read jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read jobs" ON public.jobs FOR SELECT USING (true);


--
-- Name: lead_addresses Allow public read lead_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read lead_addresses" ON public.lead_addresses FOR SELECT USING (true);


--
-- Name: lead_interactions Allow public read lead_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read lead_interactions" ON public.lead_interactions FOR SELECT USING (true);


--
-- Name: messages Allow public read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read messages" ON public.messages FOR SELECT USING (true);


--
-- Name: payroll_records Allow public read payroll_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read payroll_records" ON public.payroll_records FOR SELECT USING (true);


--
-- Name: payroll_rules Allow public read payroll_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read payroll_rules" ON public.payroll_rules FOR SELECT USING (true);


--
-- Name: roles Allow public read roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read roles" ON public.roles FOR SELECT USING (true);


--
-- Name: staff Allow public read staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read staff" ON public.staff FOR SELECT USING (true);


--
-- Name: staff_roles Allow public read staff_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read staff_roles" ON public.staff_roles FOR SELECT USING (true);


--
-- Name: transaction_rules Allow public read transaction_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read transaction_rules" ON public.transaction_rules FOR SELECT USING (true);


--
-- Name: transactions Allow public read transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read transactions" ON public.transactions FOR SELECT USING (true);


--
-- Name: company_settings Allow public update company_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update company_settings" ON public.company_settings FOR UPDATE USING (true);


--
-- Name: conversations Allow public update conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update conversations" ON public.conversations FOR UPDATE USING (true);


--
-- Name: customer_addresses Allow public update customer_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update customer_addresses" ON public.customer_addresses FOR UPDATE USING (true);


--
-- Name: customer_relationships Allow public update customer_relationships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update customer_relationships" ON public.customer_relationships FOR UPDATE USING (true);


--
-- Name: customer_terms Allow public update customer_terms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update customer_terms" ON public.customer_terms FOR UPDATE USING (true);


--
-- Name: customers Allow public update customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update customers" ON public.customers FOR UPDATE USING (true);


--
-- Name: leads Allow public update estimates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update estimates" ON public.leads FOR UPDATE USING (true);


--
-- Name: invoices Allow public update invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update invoices" ON public.invoices FOR UPDATE USING (true);


--
-- Name: jobs Allow public update jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update jobs" ON public.jobs FOR UPDATE USING (true);


--
-- Name: lead_addresses Allow public update lead_addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update lead_addresses" ON public.lead_addresses FOR UPDATE USING (true);


--
-- Name: lead_interactions Allow public update lead_interactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update lead_interactions" ON public.lead_interactions FOR UPDATE USING (true);


--
-- Name: messages Allow public update messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update messages" ON public.messages FOR UPDATE USING (true);


--
-- Name: payroll_records Allow public update payroll_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update payroll_records" ON public.payroll_records FOR UPDATE USING (true);


--
-- Name: payroll_rules Allow public update payroll_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update payroll_rules" ON public.payroll_rules FOR UPDATE USING (true);


--
-- Name: roles Allow public update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update roles" ON public.roles FOR UPDATE USING (true);


--
-- Name: staff Allow public update staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update staff" ON public.staff FOR UPDATE USING (true);


--
-- Name: staff_roles Allow public update staff_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update staff_roles" ON public.staff_roles FOR UPDATE USING (true) WITH CHECK (true);


--
-- Name: transaction_rules Allow public update transaction_rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update transaction_rules" ON public.transaction_rules FOR UPDATE USING (true);


--
-- Name: transactions Allow public update transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update transactions" ON public.transactions FOR UPDATE USING (true);


--
-- Name: job_status_tracking Authenticated users can view job status tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view job status tracking" ON public.job_status_tracking FOR SELECT TO authenticated USING (true);


--
-- Name: job_status_tracking Managers can update job status tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update job status tracking" ON public.job_status_tracking FOR UPDATE TO authenticated USING (true);


--
-- Name: ringcentral_connections Only admins can delete RingCentral connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete RingCentral connections" ON public.ringcentral_connections FOR DELETE USING (true);


--
-- Name: ringcentral_connections Only admins can insert RingCentral connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert RingCentral connections" ON public.ringcentral_connections FOR INSERT WITH CHECK (true);


--
-- Name: ringcentral_connections Only admins can update RingCentral connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update RingCentral connections" ON public.ringcentral_connections FOR UPDATE USING (true);


--
-- Name: ringcentral_connections Only admins can view RingCentral connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view RingCentral connections" ON public.ringcentral_connections FOR SELECT USING (true);


--
-- Name: platform_logs Platform admins can create logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can create logs" ON public.platform_logs FOR INSERT WITH CHECK (true);


--
-- Name: platform_admins Platform admins can insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can insert" ON public.platform_admins FOR INSERT WITH CHECK (true);


--
-- Name: platform_admins Platform admins can update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can update" ON public.platform_admins FOR UPDATE USING (true);


--
-- Name: platform_admins Platform admins can view admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view admins" ON public.platform_admins FOR SELECT USING (true);


--
-- Name: platform_logs Platform admins can view logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view logs" ON public.platform_logs FOR SELECT USING (true);


--
-- Name: job_status_tracking Staff can insert job status tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert job status tracking" ON public.job_status_tracking FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: support_ticket_messages Users can create messages on accessible tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create messages on accessible tickets" ON public.support_ticket_messages FOR INSERT WITH CHECK (true);


--
-- Name: support_tickets Users can create tickets for own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tickets for own company" ON public.support_tickets FOR INSERT WITH CHECK (true);


--
-- Name: support_tickets Users can update own company tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own company tickets" ON public.support_tickets FOR UPDATE USING (true);


--
-- Name: support_ticket_messages Users can view messages of accessible tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages of accessible tickets" ON public.support_ticket_messages FOR SELECT USING (true);


--
-- Name: support_tickets Users can view own company tickets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own company tickets" ON public.support_tickets FOR SELECT USING (true);


--
-- Name: broadcast_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: broadcast_recipients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

--
-- Name: company_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_relationships; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_relationships ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_terms ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: invoice_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: job_status_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_status_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: lead_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;

--
-- Name: payroll_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payroll_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: review_request_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_request_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ringcentral_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ringcentral_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: support_ticket_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: transaction_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transaction_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;