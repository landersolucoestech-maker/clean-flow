export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      automation_configs: {
        Row: {
          action: string
          category: string
          condition: string | null
          created_at: string
          delay_type: string | null
          delay_value: number | null
          enabled: boolean
          id: string
          label: string
          message: string
          message_to: string
          send_at_time: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          action?: string
          category?: string
          condition?: string | null
          created_at?: string
          delay_type?: string | null
          delay_value?: number | null
          enabled?: boolean
          id?: string
          label: string
          message: string
          message_to?: string
          send_at_time?: string | null
          trigger_type: string
          updated_at?: string
        }
        Update: {
          action?: string
          category?: string
          condition?: string | null
          created_at?: string
          delay_type?: string | null
          delay_value?: number | null
          enabled?: boolean
          id?: string
          label?: string
          message?: string
          message_to?: string
          send_at_time?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          automation_id: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          invoice_id: string | null
          job_id: string | null
          message_sent: string | null
          sent_at: string
          sent_to: string | null
          sent_via: string | null
          status: string | null
          trigger_type: string
        }
        Insert: {
          automation_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          message_sent?: string | null
          sent_at?: string
          sent_to?: string | null
          sent_via?: string | null
          status?: string | null
          trigger_type: string
        }
        Update: {
          automation_id?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          message_sent?: string | null
          sent_at?: string
          sent_to?: string | null
          sent_via?: string | null
          status?: string | null
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_messages: {
        Row: {
          attachment_urls: string[] | null
          completed_at: string | null
          created_at: string
          customer_filter: Json | null
          failed_count: number
          id: string
          message: string | null
          sent_at: string | null
          sent_count: number
          status: string
          total_recipients: number
        }
        Insert: {
          attachment_urls?: string[] | null
          completed_at?: string | null
          created_at?: string
          customer_filter?: Json | null
          failed_count?: number
          id?: string
          message?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
        }
        Update: {
          attachment_urls?: string[] | null
          completed_at?: string | null
          created_at?: string
          customer_filter?: Json | null
          failed_count?: number
          id?: string
          message?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          total_recipients?: number
        }
        Relationships: []
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          created_at: string
          customer_id: string
          error_message: string | null
          id: string
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          broadcast_id: string
          created_at?: string
          customer_id: string
          error_message?: string | null
          id?: string
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          broadcast_id?: string
          created_at?: string
          customer_id?: string
          error_message?: string | null
          id?: string
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcast_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          address: string | null
          business_hours: Json | null
          country: string | null
          created_at: string
          currency: string | null
          date_format: string | null
          email: string | null
          google_review_url: string | null
          gps_alert_sms_enabled: boolean | null
          gps_alert_sms_to: string | null
          gps_distance_threshold: number | null
          id: string
          legal_name: string
          locale: string | null
          logo_url: string | null
          nextdoor_review_url: string | null
          phone: string | null
          preferred_language: string | null
          review_delay_minutes: number | null
          review_delay_type: string | null
          review_message_to: string | null
          review_trigger: string | null
          tax_id: string | null
          timezone: string | null
          trade_name: string
          updated_at: string
          venmo_payment_key: string | null
          zelle_payment_key: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          google_review_url?: string | null
          gps_alert_sms_enabled?: boolean | null
          gps_alert_sms_to?: string | null
          gps_distance_threshold?: number | null
          id?: string
          legal_name?: string
          locale?: string | null
          logo_url?: string | null
          nextdoor_review_url?: string | null
          phone?: string | null
          preferred_language?: string | null
          review_delay_minutes?: number | null
          review_delay_type?: string | null
          review_message_to?: string | null
          review_trigger?: string | null
          tax_id?: string | null
          timezone?: string | null
          trade_name?: string
          updated_at?: string
          venmo_payment_key?: string | null
          zelle_payment_key?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: Json | null
          country?: string | null
          created_at?: string
          currency?: string | null
          date_format?: string | null
          email?: string | null
          google_review_url?: string | null
          gps_alert_sms_enabled?: boolean | null
          gps_alert_sms_to?: string | null
          gps_distance_threshold?: number | null
          id?: string
          legal_name?: string
          locale?: string | null
          logo_url?: string | null
          nextdoor_review_url?: string | null
          phone?: string | null
          preferred_language?: string | null
          review_delay_minutes?: number | null
          review_delay_type?: string | null
          review_message_to?: string | null
          review_trigger?: string | null
          tax_id?: string | null
          timezone?: string | null
          trade_name?: string
          updated_at?: string
          venmo_payment_key?: string | null
          zelle_payment_key?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          archived: boolean
          created_at: string
          customer_id: string | null
          favorite: boolean
          id: string
          last_message: string | null
          last_message_at: string | null
          staff_id: string | null
          unread: boolean
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          customer_id?: string | null
          favorite?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          staff_id?: string | null
          unread?: boolean
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          customer_id?: string | null
          favorite?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          staff_id?: string | null
          unread?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          additional_notes: string | null
          address: string
          city: string | null
          complement: string | null
          created_at: string
          customer_id: string
          frequency: string | null
          id: string
          name: string
          notes: string | null
          postal_code: string | null
          preferred_day: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          address: string
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id: string
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          postal_code?: string | null
          preferred_day?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          address?: string
          city?: string | null
          complement?: string | null
          created_at?: string
          customer_id?: string
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          postal_code?: string | null
          preferred_day?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_relationships: {
        Row: {
          created_at: string
          customer_id: string | null
          end_date: string | null
          end_reason: string | null
          id: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          end_reason?: string | null
          id?: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          end_reason?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_relationships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_terms: {
        Row: {
          created_at: string
          customer_id: string
          document_url: string | null
          id: string
          ip_address: string | null
          notes: string | null
          signature_text: string | null
          signed_at: string
          signed_by: string
          term_description: string | null
          term_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          document_url?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          signature_text?: string | null
          signed_at?: string
          signed_by: string
          term_description?: string | null
          term_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          document_url?: string | null
          id?: string
          ip_address?: string | null
          notes?: string | null
          signature_text?: string | null
          signed_at?: string
          signed_by?: string
          term_description?: string | null
          term_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_terms_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          additional_info: string | null
          address: string | null
          billing_contact_email: string | null
          billing_contact_name: string | null
          billing_contact_notes: string | null
          billing_contact_phone: string | null
          billing_contact_phone2: string | null
          billing_contact_relationship: string | null
          city: string | null
          created_at: string
          customer_since: string | null
          email: string | null
          frequency: string | null
          id: string
          last_service: string | null
          name: string
          notes: string | null
          payment_method: string | null
          payment_terms: string | null
          phone: string | null
          phone2: string | null
          preferred_day: string | null
          preferred_language: string | null
          rating: number | null
          revenue: number | null
          source: string | null
          state: string | null
          status: string | null
          total_jobs: number | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_notes?: string | null
          billing_contact_phone?: string | null
          billing_contact_phone2?: string | null
          billing_contact_relationship?: string | null
          city?: string | null
          created_at?: string
          customer_since?: string | null
          email?: string | null
          frequency?: string | null
          id?: string
          last_service?: string | null
          name: string
          notes?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          preferred_day?: string | null
          preferred_language?: string | null
          rating?: number | null
          revenue?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          total_jobs?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          billing_contact_email?: string | null
          billing_contact_name?: string | null
          billing_contact_notes?: string | null
          billing_contact_phone?: string | null
          billing_contact_phone2?: string | null
          billing_contact_relationship?: string | null
          city?: string | null
          created_at?: string
          customer_since?: string | null
          email?: string | null
          frequency?: string | null
          id?: string
          last_service?: string | null
          name?: string
          notes?: string | null
          payment_method?: string | null
          payment_terms?: string | null
          phone?: string | null
          phone2?: string | null
          preferred_day?: string | null
          preferred_language?: string | null
          rating?: number | null
          revenue?: number | null
          source?: string | null
          state?: string | null
          status?: string | null
          total_jobs?: number | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      invoice_reminders: {
        Row: {
          created_at: string
          email_to: string | null
          id: string
          invoice_id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          created_at?: string
          email_to?: string | null
          id?: string
          invoice_id: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          created_at?: string
          email_to?: string | null
          id?: string
          invoice_id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          auto_generated: boolean | null
          created_at: string
          created_by: string | null
          customer_id: string
          due_date: string | null
          id: string
          invoice_number: string
          invoice_type: string
          issue_date: string | null
          job_id: string | null
          lead_id: string | null
          notes: string | null
          overdue_reminder_sent_at: string | null
          qb_balance: number | null
          qb_doc_number: string | null
          qb_email_status: string | null
          qb_invoice_id: string | null
          qb_synced_at: string | null
          reminder_sent_at: string | null
          status: string
          subtotal: number | null
          tax_amount: number | null
          tax_rate: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          due_date?: string | null
          id?: string
          invoice_number: string
          invoice_type?: string
          issue_date?: string | null
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          qb_balance?: number | null
          qb_doc_number?: string | null
          qb_email_status?: string | null
          qb_invoice_id?: string | null
          qb_synced_at?: string | null
          reminder_sent_at?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          auto_generated?: boolean | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          invoice_type?: string
          issue_date?: string | null
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          overdue_reminder_sent_at?: string | null
          qb_balance?: number | null
          qb_doc_number?: string | null
          qb_email_status?: string | null
          qb_invoice_id?: string | null
          qb_synced_at?: string | null
          reminder_sent_at?: string | null
          status?: string
          subtotal?: number | null
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_estimate_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_tracking: {
        Row: {
          accuracy_meters: number | null
          address_resolved: string | null
          created_at: string
          device_info: Json | null
          distance_from_job: number | null
          edited_at: string | null
          edited_by: string | null
          id: string
          is_manual_edit: boolean | null
          job_id: string
          latitude: number | null
          longitude: number | null
          previous_value: string | null
          status_type: string
          triggered_at: string
          triggered_by: string | null
          updated_at: string
        }
        Insert: {
          accuracy_meters?: number | null
          address_resolved?: string | null
          created_at?: string
          device_info?: Json | null
          distance_from_job?: number | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          is_manual_edit?: boolean | null
          job_id: string
          latitude?: number | null
          longitude?: number | null
          previous_value?: string | null
          status_type: string
          triggered_at?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Update: {
          accuracy_meters?: number | null
          address_resolved?: string | null
          created_at?: string
          device_info?: Json | null
          distance_from_job?: number | null
          edited_at?: string | null
          edited_by?: string | null
          id?: string
          is_manual_edit?: boolean | null
          job_id?: string
          latitude?: number | null
          longitude?: number | null
          previous_value?: string | null
          status_type?: string
          triggered_at?: string
          triggered_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_status_tracking_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_tracking_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_tracking_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_notes: string | null
          address: string | null
          amount: number | null
          created_at: string
          created_by: string | null
          customer_id: string
          description: string | null
          duration_minutes: number | null
          duration_text: string | null
          feedback: string | null
          frequency: string | null
          id: string
          invoice_status: string | null
          lead_id: string | null
          notes: string | null
          on_our_way_time: string | null
          payment_status: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          service_type: string | null
          staff_assigned: string[] | null
          status: string
          time_finished: string | null
          time_started: string | null
          title: string
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          address?: string | null
          amount?: number | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          description?: string | null
          duration_minutes?: number | null
          duration_text?: string | null
          feedback?: string | null
          frequency?: string | null
          id?: string
          invoice_status?: string | null
          lead_id?: string | null
          notes?: string | null
          on_our_way_time?: string | null
          payment_status?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string | null
          staff_assigned?: string[] | null
          status?: string
          time_finished?: string | null
          time_started?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          address?: string | null
          amount?: number | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          description?: string | null
          duration_minutes?: number | null
          duration_text?: string | null
          feedback?: string | null
          frequency?: string | null
          id?: string
          invoice_status?: string | null
          lead_id?: string | null
          notes?: string | null
          on_our_way_time?: string | null
          payment_status?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          service_type?: string | null
          staff_assigned?: string[] | null
          status?: string
          time_finished?: string | null
          time_started?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string
          id: string
          lead_id: string
          name: string | null
          notes: string | null
          postal_code: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          id?: string
          lead_id: string
          name?: string | null
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          name?: string | null
          notes?: string | null
          postal_code?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_addresses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          interaction_date: string
          interaction_type: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          interaction_date?: string
          interaction_type?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          add_on_services: string[] | null
          additional_notes: string | null
          address: string | null
          agreed_amount: number | null
          bathrooms: number | null
          bedrooms: number | null
          business_name: string | null
          created_at: string
          customer_id: string
          description: string | null
          email: string | null
          estimate_approved: boolean | null
          estimate_approved_at: string | null
          estimate_number: string
          frequency: string | null
          has_job: boolean | null
          has_pets: boolean | null
          id: string
          invoice_paid: boolean | null
          invoice_paid_at: string | null
          notes: string | null
          origin: string | null
          phone: string | null
          phone2: string | null
          preferred_days: string[] | null
          preferred_time: string | null
          property_type: string | null
          referral_customer_id: string | null
          referral_name: string | null
          residence_type: string | null
          service_areas: string[] | null
          service_type: string | null
          special_instructions: string | null
          square_feet: number | null
          status: string
          subtotal: number | null
          tags: string[] | null
          tax_amount: number | null
          tax_rate: number | null
          title: string
          total: number | null
          updated_at: string
          valid_until: string | null
          visit_date: string | null
        }
        Insert: {
          add_on_services?: string[] | null
          additional_notes?: string | null
          address?: string | null
          agreed_amount?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_name?: string | null
          created_at?: string
          customer_id: string
          description?: string | null
          email?: string | null
          estimate_approved?: boolean | null
          estimate_approved_at?: string | null
          estimate_number: string
          frequency?: string | null
          has_job?: boolean | null
          has_pets?: boolean | null
          id?: string
          invoice_paid?: boolean | null
          invoice_paid_at?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          phone2?: string | null
          preferred_days?: string[] | null
          preferred_time?: string | null
          property_type?: string | null
          referral_customer_id?: string | null
          referral_name?: string | null
          residence_type?: string | null
          service_areas?: string[] | null
          service_type?: string | null
          special_instructions?: string | null
          square_feet?: number | null
          status?: string
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tax_rate?: number | null
          title: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          visit_date?: string | null
        }
        Update: {
          add_on_services?: string[] | null
          additional_notes?: string | null
          address?: string | null
          agreed_amount?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_name?: string | null
          created_at?: string
          customer_id?: string
          description?: string | null
          email?: string | null
          estimate_approved?: boolean | null
          estimate_approved_at?: string | null
          estimate_number?: string
          frequency?: string | null
          has_job?: boolean | null
          has_pets?: boolean | null
          id?: string
          invoice_paid?: boolean | null
          invoice_paid_at?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          phone2?: string | null
          preferred_days?: string[] | null
          preferred_time?: string | null
          property_type?: string | null
          referral_customer_id?: string | null
          referral_name?: string | null
          residence_type?: string | null
          service_areas?: string[] | null
          service_type?: string | null
          special_instructions?: string | null
          square_feet?: number | null
          status?: string
          subtotal?: number | null
          tags?: string[] | null
          tax_amount?: number | null
          tax_rate?: number | null
          title?: string
          total?: number | null
          updated_at?: string
          valid_until?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referral_customer_id_fkey"
            columns: ["referral_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_type: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_type?: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          base_value: number
          bonus: number
          cleaning_type: string | null
          client: string | null
          created_at: string
          employee_name: string
          id: string
          job_id: string | null
          notes: string | null
          payment_type: string
          period_end: string
          period_start: string
          staff_id: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          base_value?: number
          bonus?: number
          cleaning_type?: string | null
          client?: string | null
          created_at?: string
          employee_name: string
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_type?: string
          period_end: string
          period_start: string
          staff_id?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          base_value?: number
          bonus?: number
          cleaning_type?: string | null
          client?: string | null
          created_at?: string
          employee_name?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          payment_type?: string
          period_end?: string
          period_start?: string
          staff_id?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_rules: {
        Row: {
          base_value: number
          bonus_christmas: number
          bonus_monthly: number
          bonus_performance: number
          bonus_weekly: number
          bonus_yearly_1: number
          bonus_yearly_2: number
          created_at: string
          extra_value: number
          id: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          base_value?: number
          bonus_christmas?: number
          bonus_monthly?: number
          bonus_performance?: number
          bonus_weekly?: number
          bonus_yearly_1?: number
          bonus_yearly_2?: number
          created_at?: string
          extra_value?: number
          id?: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          base_value?: number
          bonus_christmas?: number
          bonus_monthly?: number
          bonus_performance?: number
          bonus_weekly?: number
          bonus_yearly_1?: number
          bonus_yearly_2?: number
          created_at?: string
          extra_value?: number
          id?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_rules_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "platform_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      review_request_logs: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          job_id: string
          message: string
          sent_at: string
          sms_sent: boolean | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          message: string
          sent_at?: string
          sms_sent?: boolean | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          message?: string
          sent_at?: string
          sms_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "review_request_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_request_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ringcentral_connections: {
        Row: {
          access_token: string
          account_id: string | null
          company_id: string
          connected_at: string
          created_at: string
          extension_id: string | null
          id: string
          phone_number: string | null
          refresh_token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id?: string | null
          company_id: string
          connected_at?: string
          created_at?: string
          extension_id?: string | null
          id?: string
          phone_number?: string | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string | null
          company_id?: string
          connected_at?: string
          created_at?: string
          extension_id?: string | null
          id?: string
          phone_number?: string | null
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ringcentral_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          name: string
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          name: string
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          name?: string
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_driver: boolean
          name: string
          payment_method: string | null
          phone: string | null
          quickbooks_vendor_id: string | null
          team: string | null
          updated_at: string
          zelle_key: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_driver?: boolean
          name: string
          payment_method?: string | null
          phone?: string | null
          quickbooks_vendor_id?: string | null
          team?: string | null
          updated_at?: string
          zelle_key?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_driver?: boolean
          name?: string
          payment_method?: string | null
          phone?: string | null
          quickbooks_vendor_id?: string | null
          team?: string | null
          updated_at?: string
          zelle_key?: string | null
        }
        Relationships: []
      }
      staff_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string
          id: string
          is_staff_reply: boolean
          message: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string
          id?: string
          is_staff_reply?: boolean
          message?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          closed_at: string | null
          company_id: string
          created_at: string
          description: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          company_id: string
          created_at?: string
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          closed_at?: string | null
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_rules: {
        Row: {
          category: string
          condition: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          name: string
          notes: string | null
          service_type: string | null
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          service_type?: string | null
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          service_type?: string | null
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_job_status: { Args: { staff_id: string }; Returns: boolean }
      can_trigger_job_status: { Args: { staff_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "cleaner"
        | "driver"
        | "cleaning_manager"
        | "office_manager"
        | "virtual_assistant"
      ticket_category:
        | "billing"
        | "technical"
        | "feature_request"
        | "general"
        | "account"
        | "integration"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status:
        | "open"
        | "in_progress"
        | "waiting_customer"
        | "resolved"
        | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "cleaner",
        "driver",
        "cleaning_manager",
        "office_manager",
        "virtual_assistant",
      ],
      ticket_category: [
        "billing",
        "technical",
        "feature_request",
        "general",
        "account",
        "integration",
      ],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: [
        "open",
        "in_progress",
        "waiting_customer",
        "resolved",
        "closed",
      ],
    },
  },
} as const
