export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      assinaturas: {
        Row: {
          atualizado_em: string;
          cancelar_no_fim: boolean;
          carencia_ate: string | null;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          periodo_ate: string | null;
          plano: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          teste_ate: string | null;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          cancelar_no_fim?: boolean;
          carencia_ate?: string | null;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          periodo_ate?: string | null;
          plano: string;
          status: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          teste_ate?: string | null;
        };
        Update: {
          atualizado_em?: string;
          cancelar_no_fim?: boolean;
          carencia_ate?: string | null;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          periodo_ate?: string | null;
          plano?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          teste_ate?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assinaturas_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: true;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assinaturas_plano_fkey";
            columns: ["plano"];
            isOneToOne: false;
            referencedRelation: "planos";
            referencedColumns: ["codigo"];
          },
        ];
      };
      assinaturas_admin: {
        Row: {
          autor_id: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          motivo: string;
          origem: string;
          plano: string;
          valido_ate: string;
        };
        ComputedFields: never;
        Insert: {
          autor_id: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          motivo: string;
          origem?: string;
          plano: string;
          valido_ate: string;
        };
        Update: {
          autor_id?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          motivo?: string;
          origem?: string;
          plano?: string;
          valido_ate?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assinaturas_admin_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assinaturas_admin_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assinaturas_admin_plano_fkey";
            columns: ["plano"];
            isOneToOne: false;
            referencedRelation: "planos";
            referencedColumns: ["codigo"];
          },
        ];
      };
      audit_log: {
        Row: {
          acao: string;
          antes: Json | null;
          ator_id: string | null;
          atualizado_em: string;
          criado_em: string;
          depois: Json | null;
          id: string;
          ip_hash: string | null;
          registro_id: string | null;
          tabela: string;
        };
        ComputedFields: never;
        Insert: {
          acao: string;
          antes?: Json | null;
          ator_id?: string | null;
          atualizado_em?: string;
          criado_em?: string;
          depois?: Json | null;
          id?: string;
          ip_hash?: string | null;
          registro_id?: string | null;
          tabela: string;
        };
        Update: {
          acao?: string;
          antes?: Json | null;
          ator_id?: string | null;
          atualizado_em?: string;
          criado_em?: string;
          depois?: Json | null;
          id?: string;
          ip_hash?: string | null;
          registro_id?: string | null;
          tabela?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_ator_id_fkey";
            columns: ["ator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      avaliacoes: {
        Row: {
          atualizado_em: string;
          autor_id: string;
          condominio: string;
          criado_em: string;
          denuncia_motivo: string;
          fornecedor_id: string;
          id: string;
          motivo_moderacao: string;
          nota: number;
          resposta_em: string | null;
          resposta_fornecedor: string;
          status: string;
          texto: string;
          titulo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          autor_id: string;
          condominio?: string;
          criado_em?: string;
          denuncia_motivo?: string;
          fornecedor_id: string;
          id?: string;
          motivo_moderacao?: string;
          nota: number;
          resposta_em?: string | null;
          resposta_fornecedor?: string;
          status?: string;
          texto: string;
          titulo: string;
        };
        Update: {
          atualizado_em?: string;
          autor_id?: string;
          condominio?: string;
          criado_em?: string;
          denuncia_motivo?: string;
          fornecedor_id?: string;
          id?: string;
          motivo_moderacao?: string;
          nota?: number;
          resposta_em?: string | null;
          resposta_fornecedor?: string;
          status?: string;
          texto?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "avaliacoes_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "avaliacoes_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      banner_metricas_diarias: {
        Row: {
          atualizado_em: string;
          banner_id: string;
          cliques: number;
          criado_em: string;
          dia: string;
          id: string;
          impressoes: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          banner_id: string;
          cliques?: number;
          criado_em?: string;
          dia: string;
          id?: string;
          impressoes?: number;
        };
        Update: {
          atualizado_em?: string;
          banner_id?: string;
          cliques?: number;
          criado_em?: string;
          dia?: string;
          id?: string;
          impressoes?: number;
        };
        Relationships: [
          {
            foreignKeyName: "banner_metricas_diarias_banner_id_fkey";
            columns: ["banner_id"];
            isOneToOne: false;
            referencedRelation: "banners";
            referencedColumns: ["id"];
          },
        ];
      };
      banner_posicoes: {
        Row: {
          altura: number;
          atualizado_em: string;
          criado_em: string;
          id: string;
          largura: number;
          nome: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          altura: number;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          largura: number;
          nome: string;
          slug: string;
        };
        Update: {
          altura?: number;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          largura?: number;
          nome?: string;
          slug?: string;
        };
        Relationships: [];
      };
      banners: {
        Row: {
          anunciante_nome: string;
          atualizado_em: string;
          contrato_id: string;
          criado_em: string;
          fim: string;
          id: string;
          imagem_desktop: string;
          imagem_mobile: string;
          inicio: string;
          link_destino: string;
          posicao_id: string;
          segmento_id: string | null;
          status: string;
          uf: string | null;
        };
        ComputedFields: never;
        Insert: {
          anunciante_nome: string;
          atualizado_em?: string;
          contrato_id: string;
          criado_em?: string;
          fim: string;
          id?: string;
          imagem_desktop: string;
          imagem_mobile: string;
          inicio: string;
          link_destino: string;
          posicao_id: string;
          segmento_id?: string | null;
          status?: string;
          uf?: string | null;
        };
        Update: {
          anunciante_nome?: string;
          atualizado_em?: string;
          contrato_id?: string;
          criado_em?: string;
          fim?: string;
          id?: string;
          imagem_desktop?: string;
          imagem_mobile?: string;
          inicio?: string;
          link_destino?: string;
          posicao_id?: string;
          segmento_id?: string | null;
          status?: string;
          uf?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "banners_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "banners_posicao_id_fkey";
            columns: ["posicao_id"];
            isOneToOne: false;
            referencedRelation: "banner_posicoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "banners_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "banners_uf_fkey";
            columns: ["uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
        ];
      };
      cases: {
        Row: {
          atualizado_em: string;
          condominio: string;
          criado_em: string;
          deletado_em: string | null;
          descricao: string;
          fornecedor_id: string;
          foto_url: string;
          id: string;
          oculto_por_plano: boolean;
          ordem: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          condominio: string;
          criado_em?: string;
          deletado_em?: string | null;
          descricao?: string;
          fornecedor_id: string;
          foto_url?: string;
          id?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
        };
        Update: {
          atualizado_em?: string;
          condominio?: string;
          criado_em?: string;
          deletado_em?: string | null;
          descricao?: string;
          fornecedor_id?: string;
          foto_url?: string;
          id?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cases_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      categorias: {
        Row: {
          ativa: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          ativa?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome: string;
          slug: string;
        };
        Update: {
          ativa?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          slug?: string;
        };
        Relationships: [];
      };
      cidades: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          ibge_id: number;
          id: string;
          nome: string;
          slug: string;
          uf: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          ibge_id: number;
          id?: string;
          nome: string;
          slug: string;
          uf: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          ibge_id?: number;
          id?: string;
          nome?: string;
          slug?: string;
          uf?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cidades_uf_fkey";
            columns: ["uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
        ];
      };
      cobertura: {
        Row: {
          atualizado_em: string;
          cidade_id: string | null;
          criado_em: string;
          deletado_em: string | null;
          estado_uf: string;
          fornecedor_id: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          cidade_id?: string | null;
          criado_em?: string;
          deletado_em?: string | null;
          estado_uf: string;
          fornecedor_id: string;
          id?: string;
        };
        Update: {
          atualizado_em?: string;
          cidade_id?: string | null;
          criado_em?: string;
          deletado_em?: string | null;
          estado_uf?: string;
          fornecedor_id?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cobertura_cidade_id_fkey";
            columns: ["cidade_id"];
            isOneToOne: false;
            referencedRelation: "cidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cobertura_estado_uf_fkey";
            columns: ["estado_uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
          {
            foreignKeyName: "cobertura_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      configuracoes: {
        Row: {
          atualizado_em: string;
          chave: string;
          criado_em: string;
          id: string;
          publica: boolean;
          valor: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          chave: string;
          criado_em?: string;
          id?: string;
          publica?: boolean;
          valor: NonNullable<Json>;
        };
        Update: {
          atualizado_em?: string;
          chave?: string;
          criado_em?: string;
          id?: string;
          publica?: boolean;
          valor?: NonNullable<Json>;
        };
        Relationships: [];
      };
      consentimentos: {
        Row: {
          aceito_em: string;
          atualizado_em: string;
          criado_em: string;
          documento: string;
          email: string | null;
          id: string;
          origem: string;
          user_id: string | null;
          versao: string;
        };
        ComputedFields: never;
        Insert: {
          aceito_em?: string;
          atualizado_em?: string;
          criado_em?: string;
          documento: string;
          email?: string | null;
          id?: string;
          origem: string;
          user_id?: string | null;
          versao: string;
        };
        Update: {
          aceito_em?: string;
          atualizado_em?: string;
          criado_em?: string;
          documento?: string;
          email?: string | null;
          id?: string;
          origem?: string;
          user_id?: string | null;
          versao?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consentimentos_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conteudo_redirects: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          slug_antigo: string;
          slug_novo: string;
          tipo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo: string;
          slug_novo: string;
          tipo: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo?: string;
          slug_novo?: string;
          tipo?: string;
        };
        Relationships: [];
      };
      contratos: {
        Row: {
          anunciante_nome: string;
          atualizado_em: string;
          criado_em: string;
          fim: string;
          fornecedor_id: string | null;
          id: string;
          inicio: string;
          observacao: string;
          pago: boolean;
          produto: string;
          renovacao_em: string | null;
          status: string;
          valor_centavos: number;
        };
        ComputedFields: never;
        Insert: {
          anunciante_nome: string;
          atualizado_em?: string;
          criado_em?: string;
          fim: string;
          fornecedor_id?: string | null;
          id?: string;
          inicio: string;
          observacao?: string;
          pago?: boolean;
          produto: string;
          renovacao_em?: string | null;
          status?: string;
          valor_centavos: number;
        };
        Update: {
          anunciante_nome?: string;
          atualizado_em?: string;
          criado_em?: string;
          fim?: string;
          fornecedor_id?: string | null;
          id?: string;
          inicio?: string;
          observacao?: string;
          pago?: boolean;
          produto?: string;
          renovacao_em?: string | null;
          status?: string;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "contratos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "contratos_produto_fkey";
            columns: ["produto"];
            isOneToOne: false;
            referencedRelation: "produtos_comerciais";
            referencedColumns: ["codigo"];
          },
        ];
      };
      convites: {
        Row: {
          atualizado_em: string;
          autor_id: string;
          criado_em: string;
          email: string;
          expira_em: string;
          fornecedor_id: string;
          id: string;
          revogado_em: string | null;
          tipo: string;
          token_hash: string;
          usado_em: string | null;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          autor_id: string;
          criado_em?: string;
          email: string;
          expira_em: string;
          fornecedor_id: string;
          id?: string;
          revogado_em?: string | null;
          tipo?: string;
          token_hash: string;
          usado_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          autor_id?: string;
          criado_em?: string;
          email?: string;
          expira_em?: string;
          fornecedor_id?: string;
          id?: string;
          revogado_em?: string | null;
          tipo?: string;
          token_hash?: string;
          usado_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "convites_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "convites_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      convites_proprietario: {
        Row: {
          atualizado_em: string;
          autor_id: string;
          criado_em: string;
          email: string;
          expira_em: string;
          fornecedor_id: string;
          id: string;
          revogado_em: string | null;
          token_hash: string;
          usado_em: string | null;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          autor_id: string;
          criado_em?: string;
          email: string;
          expira_em?: string;
          fornecedor_id: string;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
          usado_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          autor_id?: string;
          criado_em?: string;
          email?: string;
          expira_em?: string;
          fornecedor_id?: string;
          id?: string;
          revogado_em?: string | null;
          token_hash?: string;
          usado_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "convites_proprietario_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "convites_proprietario_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      cortesias_materia: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          quantidade: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          quantidade?: number;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          quantidade?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cortesias_materia_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: true;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      creditos_extrato: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          lead_id: string | null;
          motivo: string;
          quantidade: number;
          stripe_payment_id: string | null;
          tipo: string;
          valor: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          lead_id?: string | null;
          motivo?: string;
          quantidade: number;
          stripe_payment_id?: string | null;
          tipo: string;
          valor?: number;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          lead_id?: string | null;
          motivo?: string;
          quantidade?: number;
          stripe_payment_id?: string | null;
          tipo?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "creditos_extrato_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "creditos_extrato_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      destaques: {
        Row: {
          atualizado_em: string;
          cidade_id: string | null;
          contrato_id: string;
          criado_em: string;
          fim: string;
          fornecedor_id: string;
          id: string;
          inicio: string;
          segmento_id: string;
          status: string;
          uf: string;
          vaga: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          cidade_id?: string | null;
          contrato_id: string;
          criado_em?: string;
          fim: string;
          fornecedor_id: string;
          id?: string;
          inicio: string;
          segmento_id: string;
          status?: string;
          uf: string;
          vaga: number;
        };
        Update: {
          atualizado_em?: string;
          cidade_id?: string | null;
          contrato_id?: string;
          criado_em?: string;
          fim?: string;
          fornecedor_id?: string;
          id?: string;
          inicio?: string;
          segmento_id?: string;
          status?: string;
          uf?: string;
          vaga?: number;
        };
        Relationships: [
          {
            foreignKeyName: "destaques_cidade_id_fkey";
            columns: ["cidade_id"];
            isOneToOne: false;
            referencedRelation: "cidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "destaques_contrato_id_fkey";
            columns: ["contrato_id"];
            isOneToOne: false;
            referencedRelation: "contratos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "destaques_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "destaques_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "destaques_uf_fkey";
            columns: ["uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
        ];
      };
      email_log: {
        Row: {
          assunto: string;
          atualizado_em: string;
          criado_em: string;
          destinatario: string;
          enviado_em: string | null;
          erro: string | null;
          id: string;
          status: string;
          template: string;
        };
        ComputedFields: never;
        Insert: {
          assunto: string;
          atualizado_em?: string;
          criado_em?: string;
          destinatario: string;
          enviado_em?: string | null;
          erro?: string | null;
          id?: string;
          status: string;
          template: string;
        };
        Update: {
          assunto?: string;
          atualizado_em?: string;
          criado_em?: string;
          destinatario?: string;
          enviado_em?: string | null;
          erro?: string | null;
          id?: string;
          status?: string;
          template?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          atualizado_em: string;
          chave: string;
          criado_em: string;
          destinatario: string;
          erro: string | null;
          fornecedor_id: string | null;
          id: string;
          payload: NonNullable<Json>;
          processado_em: string | null;
          status: string;
          template: string;
          tentativas: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          chave: string;
          criado_em?: string;
          destinatario: string;
          erro?: string | null;
          fornecedor_id?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          processado_em?: string | null;
          status?: string;
          template: string;
          tentativas?: number;
        };
        Update: {
          atualizado_em?: string;
          chave?: string;
          criado_em?: string;
          destinatario?: string;
          erro?: string | null;
          fornecedor_id?: string | null;
          id?: string;
          payload?: NonNullable<Json>;
          processado_em?: string | null;
          status?: string;
          template?: string;
          tentativas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "email_outbox_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      estados: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          ibge_id: number;
          id: string;
          nome: string;
          slug: string;
          uf: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          ibge_id: number;
          id?: string;
          nome: string;
          slug: string;
          uf: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          ibge_id?: number;
          id?: string;
          nome?: string;
          slug?: string;
          uf?: string;
        };
        Relationships: [];
      };
      eventos: {
        Row: {
          criado_em: string;
          entidade: string;
          entidade_id: string;
          fornecedor_id: string | null;
          id: string;
          segmento_id: string | null;
          sessao_anonima: string;
          tipo: string;
          uf: string | null;
        };
        ComputedFields: never;
        Insert: {
          criado_em?: string;
          entidade: string;
          entidade_id: string;
          fornecedor_id?: string | null;
          id: string;
          segmento_id?: string | null;
          sessao_anonima: string;
          tipo: string;
          uf?: string | null;
        };
        Update: {
          criado_em?: string;
          entidade?: string;
          entidade_id?: string;
          fornecedor_id?: string | null;
          id?: string;
          segmento_id?: string | null;
          sessao_anonima?: string;
          tipo?: string;
          uf?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "eventos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "eventos_uf_fkey";
            columns: ["uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
        ];
      };
      faqs: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          deletado_em: string | null;
          fornecedor_id: string;
          id: string;
          ordem: number;
          pergunta: string;
          resposta: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id: string;
          id?: string;
          ordem?: number;
          pergunta: string;
          resposta: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id?: string;
          id?: string;
          ordem?: number;
          pergunta?: string;
          resposta?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faqs_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_alteracoes: {
        Row: {
          antes: string | null;
          atualizado_em: string;
          autor_id: string;
          campo: string;
          criado_em: string;
          decidido_por: string | null;
          depois: string | null;
          fornecedor_id: string;
          id: string;
          pendente: boolean;
        };
        ComputedFields: never;
        Insert: {
          antes?: string | null;
          atualizado_em?: string;
          autor_id: string;
          campo: string;
          criado_em?: string;
          decidido_por?: string | null;
          depois?: string | null;
          fornecedor_id: string;
          id?: string;
          pendente?: boolean;
        };
        Update: {
          antes?: string | null;
          atualizado_em?: string;
          autor_id?: string;
          campo?: string;
          criado_em?: string;
          decidido_por?: string | null;
          depois?: string | null;
          fornecedor_id?: string;
          id?: string;
          pendente?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_alteracoes_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedor_alteracoes_decidido_por_fkey";
            columns: ["decidido_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedor_alteracoes_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_membros: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          papel: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          papel?: string;
          user_id: string;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          papel?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_membros_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedor_membros_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedor_segmentos: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          deletado_em: string | null;
          fornecedor_id: string;
          id: string;
          segmento_id: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id: string;
          id?: string;
          segmento_id: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id?: string;
          id?: string;
          segmento_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedor_segmentos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedor_segmentos_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
        ];
      };
      fornecedores: {
        Row: {
          ano_fundacao: number | null;
          atualizado_em: string;
          cadastro_em: string;
          capa_thumb_url: string;
          capa_url: string;
          cep: string;
          certificacoes: NonNullable<Json>;
          cidade_id: string | null;
          cnpj: string;
          completude: number;
          criado_em: string;
          descricao_curta: string;
          dono_id: string | null;
          email: string;
          endereco: string;
          etapa: number;
          id: string;
          instagram: string;
          instagram_posts: NonNullable<Json>;
          logo_thumb_url: string;
          logo_url: string;
          motivo_status: string;
          nome_fantasia: string;
          plano_codigo: string;
          razao_social: string;
          site: string;
          slug: string | null;
          sobre: string;
          status: string;
          telefone: string;
          teste_fim: string | null;
          teste_inicio: string | null;
          verificado: boolean;
          video_url: string;
          whatsapp: string;
        };
        ComputedFields: never;
        Insert: {
          ano_fundacao?: number | null;
          atualizado_em?: string;
          cadastro_em?: string;
          capa_thumb_url?: string;
          capa_url?: string;
          cep?: string;
          certificacoes?: NonNullable<Json>;
          cidade_id?: string | null;
          cnpj: string;
          completude?: number;
          criado_em?: string;
          descricao_curta?: string;
          dono_id?: string | null;
          email?: string;
          endereco?: string;
          etapa?: number;
          id?: string;
          instagram?: string;
          instagram_posts?: NonNullable<Json>;
          logo_thumb_url?: string;
          logo_url?: string;
          motivo_status?: string;
          nome_fantasia: string;
          plano_codigo?: string;
          razao_social?: string;
          site?: string;
          slug?: string | null;
          sobre?: string;
          status?: string;
          telefone?: string;
          teste_fim?: string | null;
          teste_inicio?: string | null;
          verificado?: boolean;
          video_url?: string;
          whatsapp?: string;
        };
        Update: {
          ano_fundacao?: number | null;
          atualizado_em?: string;
          cadastro_em?: string;
          capa_thumb_url?: string;
          capa_url?: string;
          cep?: string;
          certificacoes?: NonNullable<Json>;
          cidade_id?: string | null;
          cnpj?: string;
          completude?: number;
          criado_em?: string;
          descricao_curta?: string;
          dono_id?: string | null;
          email?: string;
          endereco?: string;
          etapa?: number;
          id?: string;
          instagram?: string;
          instagram_posts?: NonNullable<Json>;
          logo_thumb_url?: string;
          logo_url?: string;
          motivo_status?: string;
          nome_fantasia?: string;
          plano_codigo?: string;
          razao_social?: string;
          site?: string;
          slug?: string | null;
          sobre?: string;
          status?: string;
          telefone?: string;
          teste_fim?: string | null;
          teste_inicio?: string | null;
          verificado?: boolean;
          video_url?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fornecedores_cidade_id_fkey";
            columns: ["cidade_id"];
            isOneToOne: false;
            referencedRelation: "cidades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fornecedores_dono_id_fkey";
            columns: ["dono_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      interesses_marketing: {
        Row: {
          atualizado_em: string;
          autor_id: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          mensagem: string;
          notas: string;
          servico: string;
          status: string;
          whatsapp: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          autor_id: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          mensagem?: string;
          notas?: string;
          servico: string;
          status?: string;
          whatsapp: string;
        };
        Update: {
          atualizado_em?: string;
          autor_id?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          mensagem?: string;
          notas?: string;
          servico?: string;
          status?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interesses_marketing_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interesses_marketing_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_notas: {
        Row: {
          atualizado_em: string;
          autor_id: string;
          criado_em: string;
          id: string;
          lead_id: string;
          texto: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          autor_id: string;
          criado_em?: string;
          id?: string;
          lead_id: string;
          texto: string;
        };
        Update: {
          atualizado_em?: string;
          autor_id?: string;
          criado_em?: string;
          id?: string;
          lead_id?: string;
          texto?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_notas_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_notas_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          atualizado_em: string;
          cidade: string;
          condominio_nome: string;
          consentimento_id: string;
          criado_em: string;
          email: string;
          fornecedor_id: string;
          id: string;
          liberado_credito: boolean;
          mensagem: string;
          nome: string;
          origem: string;
          pedido_id: string;
          respondido_em: string | null;
          segmento_id: string;
          solicitante_id: string | null;
          status: string;
          telefone: string;
          uf: string;
          unidades: number;
          urgencia: string;
          visto_em: string | null;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          cidade: string;
          condominio_nome: string;
          consentimento_id: string;
          criado_em?: string;
          email: string;
          fornecedor_id: string;
          id?: string;
          liberado_credito?: boolean;
          mensagem: string;
          nome: string;
          origem?: string;
          pedido_id: string;
          respondido_em?: string | null;
          segmento_id: string;
          solicitante_id?: string | null;
          status?: string;
          telefone: string;
          uf: string;
          unidades: number;
          urgencia: string;
          visto_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          cidade?: string;
          condominio_nome?: string;
          consentimento_id?: string;
          criado_em?: string;
          email?: string;
          fornecedor_id?: string;
          id?: string;
          liberado_credito?: boolean;
          mensagem?: string;
          nome?: string;
          origem?: string;
          pedido_id?: string;
          respondido_em?: string | null;
          segmento_id?: string;
          solicitante_id?: string | null;
          status?: string;
          telefone?: string;
          uf?: string;
          unidades?: number;
          urgencia?: string;
          visto_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_consentimento_id_fkey";
            columns: ["consentimento_id"];
            isOneToOne: false;
            referencedRelation: "consentimentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_solicitante_id_fkey";
            columns: ["solicitante_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      materia_consumos: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          fornecedor_id: string;
          id: string;
          materia_id: string;
          mes: string;
          origem: string;
          portal_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id: string;
          id?: string;
          materia_id: string;
          mes: string;
          origem: string;
          portal_id?: string | null;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          fornecedor_id?: string;
          id?: string;
          materia_id?: string;
          mes?: string;
          origem?: string;
          portal_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "materia_consumos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materia_consumos_materia_id_fkey";
            columns: ["materia_id"];
            isOneToOne: true;
            referencedRelation: "materias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materia_consumos_portal_id_fkey";
            columns: ["portal_id"];
            isOneToOne: false;
            referencedRelation: "portais_parceiros";
            referencedColumns: ["id"];
          },
        ];
      };
      materia_entregas: {
        Row: {
          atualizado_em: string;
          canonical_url: string;
          criado_em: string;
          entregue_em: string;
          id: string;
          materia_id: string;
          portal_id: string;
          url_externa: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          canonical_url: string;
          criado_em?: string;
          entregue_em?: string;
          id?: string;
          materia_id: string;
          portal_id: string;
          url_externa: string;
        };
        Update: {
          atualizado_em?: string;
          canonical_url?: string;
          criado_em?: string;
          entregue_em?: string;
          id?: string;
          materia_id?: string;
          portal_id?: string;
          url_externa?: string;
        };
        Relationships: [
          {
            foreignKeyName: "materia_entregas_materia_id_fkey";
            columns: ["materia_id"];
            isOneToOne: true;
            referencedRelation: "materias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materia_entregas_portal_id_fkey";
            columns: ["portal_id"];
            isOneToOne: false;
            referencedRelation: "portais_parceiros";
            referencedColumns: ["id"];
          },
        ];
      };
      materias: {
        Row: {
          agendada_em: string | null;
          atualizado_em: string;
          autor_id: string;
          canonical_url: string;
          categoria_id: string | null;
          corpo: NonNullable<Json>;
          criado_em: string;
          fornecedor_id: string | null;
          id: string;
          imagem_capa: string;
          motivo: string;
          portal_id: string | null;
          primeiro_envio_em: string | null;
          publicada_em: string | null;
          resumo: string;
          seo_descricao: string;
          seo_titulo: string;
          slug: string;
          status: string;
          tempo_leitura: number;
          tipo: string;
          titulo: string;
          versao: number;
        };
        ComputedFields: never;
        Insert: {
          agendada_em?: string | null;
          atualizado_em?: string;
          autor_id: string;
          canonical_url?: string;
          categoria_id?: string | null;
          corpo?: NonNullable<Json>;
          criado_em?: string;
          fornecedor_id?: string | null;
          id?: string;
          imagem_capa?: string;
          motivo?: string;
          portal_id?: string | null;
          primeiro_envio_em?: string | null;
          publicada_em?: string | null;
          resumo?: string;
          seo_descricao?: string;
          seo_titulo?: string;
          slug: string;
          status?: string;
          tempo_leitura?: number;
          tipo: string;
          titulo?: string;
          versao?: number;
        };
        Update: {
          agendada_em?: string | null;
          atualizado_em?: string;
          autor_id?: string;
          canonical_url?: string;
          categoria_id?: string | null;
          corpo?: NonNullable<Json>;
          criado_em?: string;
          fornecedor_id?: string | null;
          id?: string;
          imagem_capa?: string;
          motivo?: string;
          portal_id?: string | null;
          primeiro_envio_em?: string | null;
          publicada_em?: string | null;
          resumo?: string;
          seo_descricao?: string;
          seo_titulo?: string;
          slug?: string;
          status?: string;
          tempo_leitura?: number;
          tipo?: string;
          titulo?: string;
          versao?: number;
        };
        Relationships: [
          {
            foreignKeyName: "materias_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materias_categoria_id_fkey";
            columns: ["categoria_id"];
            isOneToOne: false;
            referencedRelation: "categorias";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materias_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "materias_portal_id_fkey";
            columns: ["portal_id"];
            isOneToOne: false;
            referencedRelation: "portais_parceiros";
            referencedColumns: ["id"];
          },
        ];
      };
      mensagens: {
        Row: {
          autor_id: string;
          criado_em: string;
          email: string;
          id: string;
          mensagem: string;
          nome: string;
        };
        ComputedFields: never;
        Insert: {
          autor_id: string;
          criado_em?: string;
          email: string;
          id?: string;
          mensagem: string;
          nome: string;
        };
        Update: {
          autor_id?: string;
          criado_em?: string;
          email?: string;
          id?: string;
          mensagem?: string;
          nome?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mensagens_autor_id_fkey";
            columns: ["autor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      metricas_diarias: {
        Row: {
          data: string;
          entidade: string;
          entidade_id: string;
          fornecedor_id: string | null;
          id: string;
          quantidade: number;
          segmento_id: string | null;
          tipo_evento: string;
          uf: string | null;
        };
        ComputedFields: never;
        Insert: {
          data: string;
          entidade: string;
          entidade_id: string;
          fornecedor_id?: string | null;
          id?: string;
          quantidade: number;
          segmento_id?: string | null;
          tipo_evento: string;
          uf?: string | null;
        };
        Update: {
          data?: string;
          entidade?: string;
          entidade_id?: string;
          fornecedor_id?: string | null;
          id?: string;
          quantidade?: number;
          segmento_id?: string | null;
          tipo_evento?: string;
          uf?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "metricas_diarias_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_diarias_segmento_id_fkey";
            columns: ["segmento_id"];
            isOneToOne: false;
            referencedRelation: "segmentos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "metricas_diarias_uf_fkey";
            columns: ["uf"];
            isOneToOne: false;
            referencedRelation: "estados";
            referencedColumns: ["uf"];
          },
        ];
      };
      midias: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          deletado_em: string | null;
          fornecedor_id: string;
          id: string;
          legenda: string;
          oculto_por_plano: boolean;
          ordem: number;
          tipo: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id: string;
          id?: string;
          legenda?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
          tipo?: string;
          url: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          fornecedor_id?: string;
          id?: string;
          legenda?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
          tipo?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "midias_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_inscritos: {
        Row: {
          atualizado_em: string;
          cidade: string;
          confirmado: boolean;
          confirmado_em: string | null;
          criado_em: string;
          descadastrado_em: string | null;
          email: string;
          expira_em: string;
          id: string;
          nome: string;
          origem: string;
          perfil: string;
          token_confirmacao_hash: string;
          token_descadastro_hash: string | null;
          ultimo_envio_em: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          cidade?: string;
          confirmado?: boolean;
          confirmado_em?: string | null;
          criado_em?: string;
          descadastrado_em?: string | null;
          email: string;
          expira_em: string;
          id?: string;
          nome: string;
          origem?: string;
          perfil?: string;
          token_confirmacao_hash: string;
          token_descadastro_hash?: string | null;
          ultimo_envio_em?: string;
        };
        Update: {
          atualizado_em?: string;
          cidade?: string;
          confirmado?: boolean;
          confirmado_em?: string | null;
          criado_em?: string;
          descadastrado_em?: string | null;
          email?: string;
          expira_em?: string;
          id?: string;
          nome?: string;
          origem?: string;
          perfil?: string;
          token_confirmacao_hash?: string;
          token_descadastro_hash?: string | null;
          ultimo_envio_em?: string;
        };
        Relationships: [];
      };
      pagamentos: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          estornado_centavos: number;
          estornado_creditos: number;
          fatura_url: string | null;
          fornecedor_id: string;
          id: string;
          moeda: string;
          produto: string;
          quantidade: number;
          status: string;
          stripe_charge_id: string | null;
          stripe_checkout_id: string | null;
          stripe_customer_id: string | null;
          stripe_invoice_id: string | null;
          stripe_payment_id: string | null;
          stripe_subscription_id: string | null;
          valor_centavos: number;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          estornado_centavos?: number;
          estornado_creditos?: number;
          fatura_url?: string | null;
          fornecedor_id: string;
          id: string;
          moeda?: string;
          produto: string;
          quantidade?: number;
          status?: string;
          stripe_charge_id?: string | null;
          stripe_checkout_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_id?: string | null;
          stripe_subscription_id?: string | null;
          valor_centavos: number;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          estornado_centavos?: number;
          estornado_creditos?: number;
          fatura_url?: string | null;
          fornecedor_id?: string;
          id?: string;
          moeda?: string;
          produto?: string;
          quantidade?: number;
          status?: string;
          stripe_charge_id?: string | null;
          stripe_checkout_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
          stripe_payment_id?: string | null;
          stripe_subscription_id?: string | null;
          valor_centavos?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pagamentos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      pautas: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          data_prevista: string | null;
          id: string;
          observacoes: string;
          responsavel_id: string | null;
          status: string;
          titulo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          data_prevista?: string | null;
          id?: string;
          observacoes?: string;
          responsavel_id?: string | null;
          status?: string;
          titulo: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          data_prevista?: string | null;
          id?: string;
          observacoes?: string;
          responsavel_id?: string | null;
          status?: string;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pautas_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      planos: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          codigo: string;
          criado_em: string;
          id: string;
          limites: NonNullable<Json>;
          nome: string;
          preco_centavos: number;
          stripe_price_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo: string;
          criado_em?: string;
          id?: string;
          limites: NonNullable<Json>;
          nome: string;
          preco_centavos?: number;
          stripe_price_id?: string | null;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo?: string;
          criado_em?: string;
          id?: string;
          limites?: NonNullable<Json>;
          nome?: string;
          preco_centavos?: number;
          stripe_price_id?: string | null;
        };
        Relationships: [];
      };
      portais_parceiros: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          id: string;
          nome: string;
          url: string;
          vagas_por_mes: number;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome: string;
          url: string;
          vagas_por_mes?: number;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          url?: string;
          vagas_por_mes?: number;
        };
        Relationships: [];
      };
      produtos_comerciais: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          codigo: string;
          criado_em: string;
          id: string;
          nome: string;
          preco_centavos: number;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo: string;
          criado_em?: string;
          id?: string;
          nome: string;
          preco_centavos?: number;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          preco_centavos?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          cargo: string | null;
          cidade: string | null;
          condominio_nome: string | null;
          criado_em: string;
          estado: string | null;
          id: string;
          nome: string;
          senha_pendente: boolean;
          telefone: string | null;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          cargo?: string | null;
          cidade?: string | null;
          condominio_nome?: string | null;
          criado_em?: string;
          estado?: string | null;
          id: string;
          nome: string;
          senha_pendente?: boolean;
          telefone?: string | null;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          cargo?: string | null;
          cidade?: string | null;
          condominio_nome?: string | null;
          criado_em?: string;
          estado?: string | null;
          id?: string;
          nome?: string;
          senha_pendente?: boolean;
          telefone?: string | null;
        };
        Relationships: [];
      };
      reivindicacoes: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          decidido_por: string | null;
          fornecedor_id: string;
          id: string;
          mensagem: string;
          prova_url: string;
          solicitante_id: string;
          status: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          decidido_por?: string | null;
          fornecedor_id: string;
          id?: string;
          mensagem: string;
          prova_url: string;
          solicitante_id: string;
          status?: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          decidido_por?: string | null;
          fornecedor_id?: string;
          id?: string;
          mensagem?: string;
          prova_url?: string;
          solicitante_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reivindicacoes_decidido_por_fkey";
            columns: ["decidido_por"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reivindicacoes_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reivindicacoes_solicitante_id_fkey";
            columns: ["solicitante_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      revistas: {
        Row: {
          atualizado_em: string;
          capa_url: string;
          criado_em: string;
          edicao: string;
          id: string;
          link_digital: string;
          publicada_em: string | null;
          slug: string;
          status: string;
          titulo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          capa_url?: string;
          criado_em?: string;
          edicao: string;
          id?: string;
          link_digital?: string;
          publicada_em?: string | null;
          slug: string;
          status?: string;
          titulo: string;
        };
        Update: {
          atualizado_em?: string;
          capa_url?: string;
          criado_em?: string;
          edicao?: string;
          id?: string;
          link_digital?: string;
          publicada_em?: string | null;
          slug?: string;
          status?: string;
          titulo?: string;
        };
        Relationships: [];
      };
      rotina_falhas: {
        Row: {
          codigo: string;
          criado_em: string;
          id: string;
          rotina: string;
        };
        ComputedFields: never;
        Insert: {
          codigo: string;
          criado_em?: string;
          id?: string;
          rotina: string;
        };
        Update: {
          codigo?: string;
          criado_em?: string;
          id?: string;
          rotina?: string;
        };
        Relationships: [];
      };
      segmento_redirects: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          slug_antigo: string;
          slug_novo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo: string;
          slug_novo: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo?: string;
          slug_novo?: string;
        };
        Relationships: [];
      };
      segmentos: {
        Row: {
          apelidos: string[];
          ativo: boolean;
          atualizado_em: string;
          criado_em: string;
          grupo: string;
          icone: string | null;
          id: string;
          nome: string;
          ordem: number;
          slug: string;
        };
        ComputedFields: never;
        Insert: {
          apelidos?: string[];
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          grupo?: string;
          icone?: string | null;
          id?: string;
          nome: string;
          ordem?: number;
          slug: string;
        };
        Update: {
          apelidos?: string[];
          ativo?: boolean;
          atualizado_em?: string;
          criado_em?: string;
          grupo?: string;
          icone?: string | null;
          id?: string;
          nome?: string;
          ordem?: number;
          slug?: string;
        };
        Relationships: [];
      };
      servicos: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          deletado_em: string | null;
          descricao: string;
          fornecedor_id: string;
          foto_url: string;
          id: string;
          oculto_por_plano: boolean;
          ordem: number;
          titulo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          descricao?: string;
          fornecedor_id: string;
          foto_url?: string;
          id?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
          titulo: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          deletado_em?: string | null;
          descricao?: string;
          fornecedor_id?: string;
          foto_url?: string;
          id?: string;
          oculto_por_plano?: boolean;
          ordem?: number;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "servicos_fornecedor_id_fkey";
            columns: ["fornecedor_id"];
            isOneToOne: false;
            referencedRelation: "fornecedores";
            referencedColumns: ["id"];
          },
        ];
      };
      slug_redirects: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          slug_antigo: string;
          slug_novo: string;
          tipo: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo: string;
          slug_novo: string;
          tipo: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          slug_antigo?: string;
          slug_novo?: string;
          tipo?: string;
        };
        Relationships: [];
      };
      tabela_precos: {
        Row: {
          ativo: boolean;
          atualizado_em: string;
          codigo: string;
          creditos: number;
          criado_em: string;
          id: string;
          preco_centavos: number;
        };
        ComputedFields: never;
        Insert: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo: string;
          creditos: number;
          criado_em?: string;
          id?: string;
          preco_centavos?: number;
        };
        Update: {
          ativo?: boolean;
          atualizado_em?: string;
          codigo?: string;
          creditos?: number;
          criado_em?: string;
          id?: string;
          preco_centavos?: number;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          atualizado_em: string;
          criado_em: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          atualizado_em?: string;
          criado_em?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      acao_avaliacao: {
        Args: { action: string; body?: string; rid: string };
        Returns: undefined;
      };
      acao_materia: {
        Args: { action: string; mid: string; p?: Json };
        Returns: Json;
      };
      aceitar_convite: { Args: { raw: string }; Returns: undefined };
      aceitar_propriedade: { Args: { token: string }; Returns: string };
      admin_agir: {
        Args: { p_action: string; p_data?: Json; p_id: string; p_kind: string };
        Returns: Json;
      };
      admin_importar: {
        Args: {
          p_batch?: string;
          p_commit?: boolean;
          p_invite?: boolean;
          p_rows: Json;
        };
        Returns: Json;
      };
      admin_listar: {
        Args: { p_filters?: Json; p_kind: string };
        Returns: Json;
      };
      agregar_metricas: { Args: Record<PropertyKey, never>; Returns: number };
      alertas_comerciais: { Args: Record<PropertyKey, never>; Returns: number };
      anonimizar_conta: { Args: { uid: string }; Returns: Json };
      aplicar_evento_stripe: {
        Args: { data: Json; event_id: string; event_type: string };
        Returns: Json;
      };
      atualizar_interesse: {
        Args: { new_status: string; notes?: string; rid: string };
        Returns: undefined;
      };
      banners_publicos: {
        Args: { p_position: string; p_region?: string; p_segment?: string };
        Returns: Json;
      };
      buscar_fornecedores: {
        Args: {
          p_cidade?: string;
          p_ordem?: string;
          p_pagina?: number;
          p_q?: string;
          p_segmento?: string;
          p_uf?: string;
        };
        Returns: Json;
      };
      calendario_comercial: {
        Args: { date_from: string; date_to: string; page_number?: number };
        Returns: Json;
      };
      catalogo_guia: { Args: { p_uf?: string }; Returns: Json };
      comercial_listar: {
        Args: { kind: string; page_number?: number };
        Returns: Json;
      };
      comercial_salvar: {
        Args: { kind: string; p: Json; rid: string };
        Returns: string;
      };
      concluir_exclusao_auth: { Args: { uid: string }; Returns: undefined };
      configurar_cobranca: {
        Args: { data: Json; kind: string; pid: string };
        Returns: undefined;
      };
      conteudo_publico: {
        Args: {
          category?: string;
          kind: string;
          page_number?: number;
          slug_value?: string;
        };
        Returns: Json;
      };
      convidar_membro: {
        Args: { address: string; sid: string };
        Returns: Json;
      };
      destino_banner: { Args: { bid: string }; Returns: string };
      document_version: { Args: Record<PropertyKey, never>; Returns: string };
      editorial_listar: {
        Args: { kind: string; page_number?: number };
        Returns: Json;
      };
      editorial_salvar: {
        Args: { kind: string; p: Json; rid: string };
        Returns: string;
      };
      enviar_fornecedor: { Args: { sid: string }; Returns: Json };
      enviar_mensagem: {
        Args: { p_email: string; p_mensagem: string; p_nome: string };
        Returns: string;
      };
      equipe_fornecedor: { Args: { sid: string }; Returns: Json };
      exclusoes_auth_pendentes: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      executar_rotina: { Args: { job_name: string }; Returns: boolean };
      exportar_minha_conta: { Args: Record<PropertyKey, never>; Returns: Json };
      fornecedor_publico: { Args: { p_slug: string }; Returns: Json };
      gerar_slug: { Args: { value: string }; Returns: string };
      gerenciar_orcamento: {
        Args: { lid: string; p_action: string; p_text?: string };
        Returns: undefined;
      };
      has_role: {
        Args: { role: Database["public"]["Enums"]["app_role"]; uid: string };
        Returns: boolean;
      };
      inscrever_newsletter: { Args: { p: Json; p_ip: string }; Returns: Json };
      inspecionar_convite: { Args: { raw: string }; Returns: Json };
      interesse_marketing: {
        Args: { body: string; phone: string; service: string; sid: string };
        Returns: string;
      };
      liberar_orcamento: { Args: { lid: string }; Returns: undefined };
      limitar_conta: { Args: { chaves: string[] }; Returns: boolean };
      link_relatorio: {
        Args: { bid: string; operation?: string };
        Returns: Json;
      };
      listar_avaliacoes: {
        Args: { mode?: string; page_number?: number; sid: string };
        Returns: Json;
      };
      listar_interesses: {
        Args: { page_number?: number; sid?: string };
        Returns: Json;
      };
      listar_orcamentos: { Args: { sid: string }; Returns: Json };
      meus_orcamentos: { Args: { page_number?: number }; Returns: Json };
      newsletter_token: {
        Args: { p_action: string; p_token: string };
        Returns: Json;
      };
      obter_fornecedor: { Args: { sid: string }; Returns: Json };
      preparar_alertas_orcamento: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      preparar_checkout: {
        Args: { product: string; request_id: string; sid: string };
        Returns: Json;
      };
      preparar_lembretes_fornecedor: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      processar_ciclo_planos: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      publicar_agendadas: { Args: Record<PropertyKey, never>; Returns: number };
      receber_orcamento: {
        Args: {
          p_data: Json;
          p_hash: string;
          p_id: string;
          p_ip: string;
          p_user?: string;
        };
        Returns: Json;
      };
      redirecionamento_segmento: { Args: { slug: string }; Returns: string };
      registrar_evento: {
        Args: {
          consented: boolean;
          eid: string;
          etype: string;
          ip_hash: string;
          region?: string;
          segment?: string;
          session_id: string;
          target: string;
        };
        Returns: Json;
      };
      registrar_evento_banner: {
        Args: {
          bid: string;
          consented: boolean;
          event_id: string;
          event_type: string;
          ip_hash: string;
        };
        Returns: Json;
      };
      registrar_falha_rotina: {
        Args: { error_code: string; job_name: string };
        Returns: undefined;
      };
      reivindicar_fornecedor: {
        Args: { document: string; message: string; proof: string };
        Returns: undefined;
      };
      relatorio_anunciante: {
        Args: { date_from: string; date_to: string; token: string };
        Returns: Json;
      };
      relatorio_editorial: {
        Args: {
          date_from: string;
          date_to: string;
          page_number?: number;
          sid: string;
        };
        Returns: Json;
      };
      reservar_emails_fornecedor: {
        Args: Record<PropertyKey, never>;
        Returns: {
          atualizado_em: string;
          chave: string;
          criado_em: string;
          destinatario: string;
          erro: string | null;
          fornecedor_id: string | null;
          id: string;
          payload: NonNullable<Json>;
          processado_em: string | null;
          status: string;
          template: string;
          tentativas: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "email_outbox";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      resumo_metricas: {
        Args: { date_from: string; date_to: string; sid: string };
        Returns: Json;
      };
      resumo_plano: { Args: { sid: string }; Returns: Json };
      retencao_privacidade: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
      revogar_membro: {
        Args: { is_invite: boolean; sid: string; target: string };
        Returns: undefined;
      };
      rotinas_crescimento: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      saldo_materias: { Args: { sid: string }; Returns: Json };
      salvar_avaliacao: {
        Args: {
          body: string;
          condo?: string;
          rating: number;
          sid: string;
          title: string;
        };
        Returns: string;
      };
      salvar_fornecedor: {
        Args: { data: Json; sid: string; step: number; version?: string };
        Returns: Json;
      };
      salvar_materia: {
        Args: { expected?: number; mid: string; p: Json; sid: string };
        Returns: Json;
      };
      set_plano_fornecedor: {
        Args: { code: string; reason: string; sid: string; until_at: string };
        Returns: undefined;
      };
      sitemap_publico: { Args: Record<PropertyKey, never>; Returns: Json };
      status_rotinas: { Args: Record<PropertyKey, never>; Returns: Json };
      validar_sessao_conta: {
        Args: { sessao: string; uid: string };
        Returns: boolean;
      };
      verificar_login: { Args: { event: Json }; Returns: Json };
      vincular_checkout: {
        Args: { customer_id?: string; oid: string; session_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "editor" | "comercial" | "fornecedor" | "sindico";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "comercial", "fornecedor", "sindico"],
    },
  },
} as const;
