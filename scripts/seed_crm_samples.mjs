import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tenantId = "8d3d9f3a-7d4a-4b6a-9e1a-5c3d9f3a7d4a"; // Default test tenant

async function seedCrmSamples() {
  console.log("Seeding CRM sample data...");

  const samples = [
    // Leads
    {
      doctype_key: "crm_lead",
      company_id: tenantId,
      data: {
        lead_name: "John Doe",
        company_name: "Tech Corp",
        email: "john@techcorp.com",
        source: "Website",
        status: "New",
        owner_name: "Saikumar",
        is_active: true,
        notes: "Interested in enterprise plan."
      }
    },
    {
      doctype_key: "crm_lead",
      company_id: tenantId,
      data: {
        lead_name: "Jane Smith",
        company_name: "Design Studio",
        email: "jane@design.io",
        source: "Referral",
        status: "Contacted",
        owner_name: "Saikumar",
        is_active: true,
        notes: "Wants a demo next week."
      }
    },
    // Accounts
    {
      doctype_key: "crm_account",
      company_id: tenantId,
      data: {
        account_name: "Global Industries",
        industry: "Manufacturing",
        city: "New York",
        status: "Prospect",
        is_active: true
      }
    },
    // Opportunities
    {
      doctype_key: "crm_opportunity",
      company_id: tenantId,
      data: {
        opportunity_name: "Enterprise ERP License",
        account_name: "Global Industries",
        stage: "Proposal",
        expected_value: 50000,
        expected_close_date: "2026-08-30",
        probability: 60,
        is_active: true
      }
    },
    {
      doctype_key: "crm_opportunity",
      company_id: tenantId,
      data: {
        opportunity_name: "Quick Startup Pack",
        account_name: "Design Studio",
        stage: "Won",
        expected_value: 5000,
        expected_close_date: "2026-06-01",
        probability: 100,
        is_active: true
      }
    },
    // Follow-up Tasks
    {
      doctype_key: "crm_followup_task",
      company_id: tenantId,
      data: {
        subject: "Send demo link to Jane",
        related_to: "Jane Smith",
        due_date: "2026-06-05",
        status: "Open",
        priority: "High",
        assigned_to: "Saikumar",
        is_active: true
      }
    }
  ];

  for (const sample of samples) {
    // Basic check to avoid exact duplicates (by name/subject in data)
    const nameField = sample.doctype_key === "crm_followup_task" ? "subject" : 
                      sample.doctype_key === "crm_opportunity" ? "opportunity_name" :
                      sample.doctype_key === "crm_lead" ? "lead_name" : "account_name";
    
    const { data: existing } = await supabase.schema("app")
      .from("erp_documents")
      .select("id")
      .eq("doctype_key", sample.doctype_key)
      .eq("company_id", sample.company_id)
      .contains("data", { [nameField]: sample.data[nameField] })
      .maybeSingle();

    if (!existing) {
      const { error } = await supabase.schema("app")
        .from("erp_documents")
        .insert(sample);
      
      if (error) {
        console.error(`Error inserting ${sample.doctype_key}:`, error.message);
      } else {
        console.log(`Inserted ${sample.doctype_key}: ${sample.data[nameField]}`);
    }
  } else {
    console.log(`Skipped existing ${sample.doctype_key}: ${sample.data[nameField]}`);
  }
}

  console.log("CRM seeding complete.");
}

seedCrmSamples().catch(console.error);
