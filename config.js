// Configuracion compartida del sitio. Si cambias el JWT_SECRET de Supabase,
// solo actualiza SUPABASE_ANON_KEY aqui (la clave ANON es publica por diseno;
// la seguridad la dan las politicas RLS de supabase/seguridad.sql).
window.LIC_CONFIG = {
    SUPABASE_URL: "https://licmanene-supabase.vms1bk.easypanel.host",
    SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzCB_kipRvhZ5fwDwNK7mJ8u3SJLV3Rt_P5e2htYhKrHfJdyupGMe5BDsL_dncrGKPFPA/exec"
};
