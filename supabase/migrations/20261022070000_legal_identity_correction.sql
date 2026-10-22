update public.configuracoes set valor=jsonb_set(valor,'{cnpj}','"53.816.326/0001-58"') where chave='identidade_legal' and coalesce(valor->>'cnpj','')='';
