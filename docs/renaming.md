# How to change the website name (address) of your planner

Written for a complete beginner. Nothing here needs the command line — every step is clicking in a
web browser.

## First, understand where the address comes from

Your planner currently lives at:

```
https://jacksouri.github.io/Day-planner/
   ^^^^^^^^                  ^^^^^^^^^^
   your GitHub username      the name of the repository
```

GitHub builds that address out of two things: **your username** and **the repository name**. There is
no separate "website name" setting. So to change the address you either:

- **Option A** — rename the repository (free, 2 minutes, gives you `.../new-name/`), or
- **Option B** — rename the repository to `jacksouri.github.io` (free, gives you the short address
  `https://jacksouri.github.io/` with nothing after it), or
- **Option C** — buy a domain like `jacksplanner.com` and point it at the site (costs money, ~10–15
  minutes), or
- **Option D** — you only want the *title shown under the icon* to change, not the web address. That
  is a different, easier change: skip to [Changing the app's name](#option-d--change-the-name-shown-under-the-icon-not-the-address).

**Before you start (30 seconds, do not skip):** open the planner, tap **Sync → Export snapshot**, and
keep that file. It is a backup of your tasks in case anything goes sideways.

---

## Option A — rename the repository

### Step 1: open the repository settings

1. In a browser, go to <https://github.com/Jacksouri/Day-planner>.
2. Along the top of the page there is a row of tabs: `Code`, `Issues`, `Pull requests`, `Actions`,
   `Projects`, `Wiki`, `Security`, `Insights`, `Settings`. Click **Settings** (far right, with a gear
   icon). If you do not see it, you are signed out or signed in as the wrong user — sign in as
   `Jacksouri`.
3. You land on the **General** settings page. The very first box is titled **Repository name** and
   contains `Day-planner`.

### Step 2: type the new name

4. Click in that box, delete `Day-planner`, and type the name you want.

   Rules for the name: letters, numbers, hyphens (`-`), underscores (`_`) and dots only — **no
   spaces**. It becomes part of your web address, so lowercase and hyphens read best.

   | You type | Your planner's new address |
   | --- | --- |
   | `planner` | `https://jacksouri.github.io/planner/` |
   | `my-day` | `https://jacksouri.github.io/my-day/` |
   | `jp-planner` | `https://jacksouri.github.io/jp-planner/` |

5. Click the **Rename** button next to the box. The page reloads and the title now shows the new
   name. That is the rename done — GitHub moves everything for you.

### Step 3: rebuild the site at its new address

The website itself is rebuilt by an automation ("workflow") that runs on every change. Renaming the
repository does not itself trigger it, so nudge it:

6. Click the **Actions** tab (top of the repository page).
7. In the left-hand list of workflows, click **Deploy to GitHub Pages**.
8. On the right there is a grey bar saying *"This workflow has a workflow_dispatch event trigger."*
   with a **Run workflow** button. Click **Run workflow**, leave the branch as `main`, and click the
   green **Run workflow** button in the little pop-up.
9. Wait. After a few seconds a new row appears at the top of the list with a yellow spinning dot.
   Refresh the page every 20 seconds or so until the dot turns into a **green tick** (usually under a
   minute).

   If instead you get a **red X**, click the row, click the failed job, and read the red lines — then
   send that text to me and I will fix it.

10. Open your new address in the browser: `https://jacksouri.github.io/<the-name-you-typed>/`
    (mind the trailing `/`). You should see the planner.

    Seeing **404**? Wait two minutes and refresh — the first build after a rename can lag. If it is
    still 404, go to **Settings → Pages** and check that **Source** says **GitHub Actions**.

### Step 4: reinstall it on your iPhone (required)

This is the part people miss. GitHub forwards the old *repository* address to the new one, but it does
**not** forward the old *website* address — `https://jacksouri.github.io/Day-planner/` simply stops
working, and the icon already on your home screen still points there.

11. On the iPhone, press and hold the old **Planner** icon → **Remove App** → **Delete from Home
    Screen**.
12. Open **Safari** and go to the new address.
13. Tap **Share** (the square with the arrow) → **Add to Home Screen** → **Add**.
14. Do the same on your computer if you installed it there (uninstall the old app, install from the
    new address).

Your tasks are stored per website *domain*, and the domain (`jacksouri.github.io`) has not changed, so
they should still be there. If the list looks empty, use **Sync → Import & merge** with the backup file
from the beginning of this guide.

### One warning about the old name

Never create another repository named `Day-planner` on this account afterwards. Doing so breaks
GitHub's forwarding of the old links.

---

## Option B — get the short address `https://jacksouri.github.io/`

Same steps as Option A, but at Step 4 type exactly:

```
jacksouri.github.io
```

GitHub treats a repository named `<your-username>.github.io` specially and serves it at the root of
your GitHub address, with no folder on the end:

```
https://jacksouri.github.io/
```

This is the shortest address you can get for free. The catch: you only get **one** of these per GitHub
account, so if you later want a different project at the root you would have to rename this one again.
Everything else (Steps 5–14 above) is identical.

---

## Option C — use your own domain, e.g. `jacksplanner.com`

Worth it if you want a name with no `github.io` in it, or if you expect to rename things again later —
with a custom domain the address stops depending on the repository name.

1. Buy the domain from any registrar (Namecheap, Cloudflare, Porkbun, Google Domains…). Roughly
   $10–15 a year.
2. In the registrar's control panel, find **DNS** / **DNS records** and add records:

   To use a subdomain such as `planner.jacksplanner.com` (simplest and recommended) add one record:

   | Type | Name / Host | Value / Target |
   | --- | --- | --- |
   | CNAME | `planner` | `jacksouri.github.io.` |

   To use the bare domain `jacksplanner.com` add four A records instead, all with Name `@`:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |

   (Those four are GitHub's published Pages addresses. If a rare future change is a worry, confirm
   them in GitHub's "Managing a custom domain for your GitHub Pages site" docs.)

3. Back in the repository: **Settings → Pages → Custom domain**, type your domain, click **Save**.
4. Wait for the "DNS check successful" message (minutes to a few hours, depending on the registrar),
   then tick **Enforce HTTPS**.
5. Reinstall the home-screen icon from the new address, as in Step 4 of Option A.

---

## Option D — change the name shown under the icon (not the address)

If you only dislike the words *Day Planner* / *Planner* under the icon, the address can stay as it is.
Three places hold that text — send me the name you want and I will change them, or edit them yourself
on GitHub with the pencil (✏️) button on each file:

| File | What to change |
| --- | --- |
| `vite.config.ts` | `name: 'Day Planner'` (full name) and `short_name: 'Planner'` (the ≤12-character label under the icon) |
| `index.html` | `<title>Day Planner</title>` (browser tab) and `apple-mobile-web-app-title` (iPhone label) |
| `README.md` | the heading, cosmetic only |

After saving, the **Deploy to GitHub Pages** workflow runs on its own; then delete and re-add the home
screen icon, because iOS caches the old label and icon forever otherwise.

---

## Quick reference

| Goal | Do this |
| --- | --- |
| `.../planner/` instead of `.../Day-planner/` | Option A |
| No folder at all: `https://jacksouri.github.io/` | Option B |
| Your own domain name | Option C |
| Different words under the icon | Option D |
| Address must never change again | Option C |
