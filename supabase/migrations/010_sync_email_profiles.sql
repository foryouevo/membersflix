-- Sincroniza profiles.email com auth.users.email sempre que o e-mail de
-- LOGIN for alterado (ex: fluxo de "Editar Perfil" em app/membros/perfil,
-- que chama supabase.auth.updateUser({ email }) direto do client — ver
-- EditarPerfilModal.tsx). O Supabase Auth só aplica a troca de fato em
-- auth.users DEPOIS que o aluno confirma o(s) link(s) recebido(s) por
-- e-mail ("secure email change"), então este trigger dispara exatamente
-- nesse momento — sem precisar de nenhuma rota de callback própria pra
-- "pegar" a confirmação.
--
-- Sem isso, profiles.email (coluna copiada só uma vez, no signup — ver
-- handle_new_user() logo acima neste schema) ficaria desatualizado pra
-- sempre após a primeira troca de e-mail confirmada: o aluno passaria a
-- logar com o e-mail novo, mas a tela de Perfil continuaria mostrando o
-- antigo.
create or replace function public.handle_user_email_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_user_email_updated();
