# Correção do logotipo original

Implementação: remover wordmark HTML/CSS usado como substituição; remover zoom de200% e recorte; renderizar exclusivamente a imagem original com object-fit contain, proporção preservada. Arquivo ausente deve apresentar aviso neutro, nunca uma imitação do logotipo.

Preflight: ler snapshot atual, publicar apenas componente/CSS/testes alterados, manter app_id e slot Logotipo em public/resources/logotipo.jpg. Build TypeScript, cinco testesJSON e umsanity. Não gerar imagem, não embutir bytes nem usar caminho do anexo. A aplicação do arquivo original exige envio real no widget Recursos, conforme instrução AppDeploy. Não declarar imagem aplicada sem confirmação do upload.
