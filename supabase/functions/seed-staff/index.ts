import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const staffMembers = [
  "Maria Hesse",
  "Alma",
  "Anali Ap (Nana) Perpetua M da Silva",
  "Anielka Carmen",
  "Bia Moriwaki",
  "Carla Batista da Cruz",
  "Claudia Luci Roberto Gonçalves",
  "Daniela Maria M de Souza",
  "Dunia Mayen",
  "Elaine T.",
  "Elizabeth Alvarenga",
  "Fernanda VA",
  "Gesieli Santana Feitoza",
  "Gloria Galicia Crescencio",
  "Ingris Xiomara B Huezo",
  "Isabella Chagas",
  "Iveth Mariche",
  "Ixa Issayra",
  "Jane Bressan",
  "Jennifer Garcia",
  "Jessica Sauceda",
  "Jharling",
  "Juliana Ramos",
  "Karina Arias",
  "Karina Mayer",
  "Katia Palacios",
  "Kensy Aguilera",
  "Lucy Santos",
  "Marcela da Silva",
  "Marcia Moriwaki",
  "Mari Reyes",
  "Nahomy",
  "Nellymar",
  "Neusiele Ap da Silva",
  "Ninky Araiaca Herrera",
  "Nohemi Urbina",
  "Rayssa Nonato",
  "Renato Vieira",
  "Reyna",
  "Sannya",
  "Sarahi Adela",
  "Selenia Eduardito",
  "Veronica Bonilha",
  "Veronica H",
  "Yessi Matheu",
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check existing staff to avoid duplicates
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("name");

    const existingNames = new Set(existingStaff?.map(s => s.name.toLowerCase()) || []);

    // Filter out already existing staff
    const newStaff = staffMembers
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map(name => ({
        name,
        is_driver: false,
        is_active: true,
      }));

    if (newStaff.length === 0) {
      return new Response(
        JSON.stringify({ message: "All staff members already exist", added: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("staff")
      .insert(newStaff)
      .select();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully added ${data.length} staff members`,
        added: data.length,
        staff: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error seeding staff:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
