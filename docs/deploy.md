# Отчёт: initial commit и публикация в GitHub

Коротко

Мы подготовили и опубликовали initial commit для репозитория `Kwentin3/mapper`. В отчёте описаны цель, что пошло не так при первой попытке push (SSH), и какие шаги были предприняты для успешной публикации (установка `gh`, аутентификация, переключение remote на HTTPS и push).

1) Что хотели сделать

- Инициализировать git в папке проекта.
- Сделать root-commit с сообщением:

```
chore: initial commit — Architecture Mapper (deterministic codebase mapping for agents)
```

- Запушить ветку `main` в удалённый репозиторий `git@github.com:Kwentin3/mapper.git`.

2) Что произошло (проблема)

- Репозиторий изначально не содержал `.git` — инициализация была запланирована.
- После создания root-commit попытка `git push` завершилась ошибкой аутентификации SSH:

```
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

Причина: локальная машина не имела корректно настроенного SSH-ключа для доступа к GitHub по SSH.

3) Что сделали для исправления

Шаги, выполненные последовательно:

- Инициализация и первый коммит (локально):

```powershell
git init
git branch -M main
git remote add origin git@github.com:Kwentin3/mapper.git
git add -A
# подготовлен commitmsg.txt
git -c user.name=Roman -c user.email=roman@users.noreply.github.com commit -F commitmsg.txt
```

- Попытка `git push` по SSH — получила Permission denied (publickey).

- Установили GitHub CLI (`gh`) через Chocolatey (так как winget/scoop отсутствовали):

```powershell
choco install gh -y
```

- Запустили аутентификацию GitHub CLI (device/browser flow). GitHub CLI выдал одноразовый код и URL для завершения входа:

```
One-time code: 8B38-07A2
Open: https://github.com/login/device
```

Пользователь подтвердил вход в браузере (login device flow).

- `gh auth status` подтвердил, что пользователь `Kwentin3` авторизован; токен с доступом `repo` доступен.

- Несмотря на успешную авторизацию через `gh`, `git push` по SSH по-прежнему возвращал ошибку (потому что remote был SSH URL и Git использует SSH ключи для аутентификации).

- Чтобы воспользоваться HTTPS-авторизацией через `gh`/GCM, переключили remote на HTTPS и повторили push:

```powershell
git remote set-url origin https://github.com/Kwentin3/mapper.git
git push -u origin main
```

- Push успешно завершился. Ветка `main` была опубликована и настроена для отслеживания `origin/main`.

4) Ключные доказательства (выборочные выводы команд)

- Последний коммит (локально и в origin):

```
git log -1 --oneline
b460f1b (HEAD -> main, origin/main) chore: initial commit — Architecture Mapper (deterministic codebase mapping for agents)
```

- Статус ветки и отслеживание:

```
git status -sb
## main...origin/main
```

- Remote после переключения:

```
git remote -v
origin  https://github.com/Kwentin3/mapper.git (fetch)
origin  https://github.com/Kwentin3/mapper.git (push)
```

- Push-результат (фрагмент):

```
To https://github.com/Kwentin3/mapper.git
 * [new branch]      main -> main
 branch 'main' set up to track 'origin/main'.
```

5) Выводы и рекомендации

- Почему сначала не получилось: изначально remote был настроен на SSH (git@github.com:...), а на машине не был добавлен SSH-публичный ключ в профиль GitHub → `Permission denied (publickey)`.

- Что сработало: аутентификация через GitHub CLI по browser/device flow + переключение remote на HTTPS позволили пушить, используя token/credential helper — быстрый и безопасный путь для первоначальной публикации.

- Рекомендации на будущее:
  - Если хотите оставаться на SSH, выполните локальную генерацию ключа `ssh-keygen` и добавьте публичный ключ в GitHub Account → Settings → SSH and GPG keys.
  - Если предпочитаете HTTPS, `gh auth login --web` или Git Credential Manager (GCM) дают удобный токенный доступ.

6) Ссылки

- Репозиторий опубликован: https://github.com/Kwentin3/mapper (ветка `main`)

---

Файл создан автоматически как отчёт о деплое initial commit и публикации.
