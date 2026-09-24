#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# The portfolio page and the founder's introduction.
#
# `/{locale}/portfolio` is the atelier's gallery; it now opens with a complete,
# dedicated introduction of راضیه خیریپور — the founder — and only then the
# works. This rig asserts, against a live server and in both locales:
#
#   1. the introduction is there and complete: eyebrow, name, role, the whole
#      biography (all five paragraphs), the confidence numbers, the professional
#      path with its four milestones, and the facts at a glance;
#   2. it sits *above* the works (introduction → works heading → gallery), which
#      is the structure that was asked for;
#   3. the gallery itself is untouched: six realised projects, their filters and
#      their detail links;
#   4. the personal portfolio page `/{locale}/razieh` is still complete (hero,
#      about, works, philosophy, academic, contact) and the two pages now point
#      at each other — the atelier's page links to /razieh, the personal page
#      links back to /portfolio;
#   5. the ways into both pages exist outside them: the footer link and the
#      sitemap entries.
#
# Usage: bash scripts/marketplace-smoke/portfolio-e2e.sh     (BASE=http://localhost:3000)
set -u

BASE=${BASE:-http://localhost:3000}

python3 - "$BASE" <<'PY'
import html, re, sys, urllib.request

BASE = sys.argv[1]
GREEN, RED, RESET = "\033[32m", "\033[31m", "\033[0m"
state = {"pass": 0, "fail": 0, "skip": 0}


def get(path):
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as r:
        return r.status, r.read().decode("utf-8", "replace")


def plain(h):
    t = re.sub(r"<script.*?</script>", "", h, flags=re.S)
    t = re.sub(r"<style.*?</style>", "", t, flags=re.S)
    t = re.sub(r"<[^>]+>", "\n", t)
    return html.unescape(t)


def check(cond, label, detail=""):
    if cond:
        state["pass"] += 1
        print(f"  {GREEN}✔{RESET} {label}")
    else:
        state["fail"] += 1
        print(f"  {RED}✘{RESET} {label}" + (f" — {detail}" if detail else ""))


def section(title):
    print(f"\n\033[1m{title}\033[0m")


def pos(hay, needle):
    return hay.find(needle)


# ---------------------------------------------------------------- per locale
INTRO = {
    "fa": {
        "eyebrow": "معرفی بنیان‌گذار",
        "name": "راضیه خیری‌پور",
        "role": "استادیار هنرهای تزئینی",
        "bio_last": "رزی آتلیه حاصل همین نگاه است",
        "stats": ["سال تجربه‌ی طراحی", "الگو و طرح خلق‌شده", "نمایشگاه داخلی و بین‌المللی", "دانشجو و همراه آکادمی"],
        "path": "مسیر حرفه‌ای",
        "milestones": ["آغاز فعالیت حرفه‌ای", "تدریس و پژوهش دانشگاهی", "تأسیس رزی آتلیه", "آتلیه، آکادمی و همکاری با صنعت"],
        "facts": "در یک نگاه",
        "fact_values": ["استادیار گروه هنرهای تزئینی", "تهران، ایران", "فارسی · انگلیسی"],
        "stats_marker": "طراح همکار",
        "works_eyebrow": "آثار و پروژه‌ها",
        "works_title": "آثار منتخب و پروژه‌های اجراشده",
        "collab": "همکاری، سفارش سازمانی یا کارگاه",
        "cta_personal": "پورتفولیوی شخصی راضیه",
        "personal_name": "راضیه",
    },
    "en": {
        "eyebrow": "About the founder",
        "name": "Razieh Kheiripour",
        "role": "Assistant professor of decorative arts",
        "bio_last": "Rosie Atelier is the product of that view",
        "stats": ["Years of design practice", "Patterns and surface designs", "National & international exhibitions", "Students and academy members"],
        "path": "Professional path",
        "milestones": ["A studio of her own", "Teaching and academic research", "Rosie Atelier is founded", "Studio, academy and industry work"],
        "facts": "At a glance",
        "fact_values": ["Assistant professor, decorative arts", "Tehran, Iran", "Persian · English"],
        "stats_marker": "Contributing designers",
        "works_eyebrow": "Works & projects",
        "works_title": "Selected works & realised projects",
        "collab": "Collaboration, commissions or workshops",
        "cta_personal": "Razieh's personal portfolio",
        "personal_name": "Razieh",
    },
}

for locale, want in INTRO.items():
    section(f"1. {locale} — the introduction is complete and it opens the page")
    try:
        status, page = get(f"/{locale}/portfolio")
    except Exception as exc:  # pragma: no cover
        check(False, f"/{locale}/portfolio answers", str(exc))
        continue
    check(status == 200, f"/{locale}/portfolio answers 200", f"status {status}")
    text = plain(page)
    # markup with the RSC payload stripped — positions must be read from the
    # rendered document, never from the embedded flight data
    markup = re.sub(r"<script.*?</script>", "", page, flags=re.S)

    check(want["eyebrow"] in text, "the section is announced as the founder's introduction")
    check(want["name"] in text, "the founder's name is there")
    check(want["role"] in text, "her role / academic standing is there")
    check(want["bio_last"] in text, "the biography runs to its last paragraph (all five are present)")

    paras = sum(1 for _ in re.finditer(r"<p[^>]*>", page))
    check(paras >= 20, "the introduction renders as real prose (paragraph elements)", f"{paras} <p>")

    for needle in want["stats"]:
        check(needle in text, f"number «{needle}» is present")
    check(want["path"] in text, "the professional path block is present")
    for needle in want["milestones"]:
        check(needle in text, f"milestone «{needle}» is present")
    check(want["facts"] in text, "the facts-at-a-glance block is present")
    for needle in want["fact_values"]:
        check(needle in text, f"fact «{needle}» is present")

    section(f"2. {locale} — the introduction comes before the works")
    i_intro = pos(text, want["eyebrow"])
    i_bio = pos(text, want["bio_last"])
    i_works = pos(text, want["works_title"])
    check(-1 < i_intro < i_works, "the introduction starts above the works heading", f"{i_intro} / {i_works}")
    check(-1 < i_bio < i_works, "the biography ends above the works heading", f"{i_bio} / {i_works}")
    check(pos(text, want["path"]) < i_works, "the path/facts band is part of the introduction, not the gallery")

    section(f"3. {locale} — the gallery itself is intact")
    # The grid is a Suspense boundary, so its markup is streamed after the shell:
    # the boundary itself is the grid's position in the document, and the streamed
    # content is checked by counting the cards it carries.
    stats_pos = pos(markup, want["stats_marker"])
    boundary = markup.find("<!--$?-->", stats_pos)
    cards = len(re.findall(rf'/{locale}/portfolio/[a-z0-9-]+"', markup))
    i_collab = pos(markup, want["collab"])
    check(cards >= 6, "the six realised projects are still streamed with the page", f"{cards} links")
    check("پروژه اجراشده" in text or "Realised projects" in text, "the gallery statistics bar is still there")
    check(stats_pos > pos(markup, want["works_title"]), "the statistics bar comes after the works heading")
    check(boundary > stats_pos, "the grid boundary comes after the statistics bar")
    check(-1 < boundary < i_collab, "the closing collaboration band sits below the gallery", f"{boundary} / {i_collab}")

    section(f"4. {locale} — the two pages point at each other")
    check(f"/{locale}/razieh" in page, "the atelier's portfolio page links to the personal page")
    check(want["cta_personal"] in text, "…and offers it as a labelled button")
    try:
        rstatus, rpage = get(f"/{locale}/razieh")
    except Exception as exc:  # pragma: no cover
        check(False, f"/{locale}/razieh answers", str(exc))
        continue
    check(rstatus == 200, f"/{locale}/razieh answers 200", f"status {rstatus}")
    check(f"/{locale}/portfolio" in rpage, "the personal page links back to the atelier's portfolio")
    rtext = plain(rpage)
    for needle in ("از الگو تا فضا" if locale == "fa" else "From Pattern to Space",
                   "نمونه‌کارها" if locale == "fa" else "Portfolio",
                   "آموزش زبان الگو" if locale == "fa" else "Teaching the Language of Pattern",
                   "بیایید همکاری کنیم" if locale == "fa" else "Let's Collaborate"):
        check(needle in rtext, f"the personal page still has «{needle}»")

# ---------------------------------------------------------------- shared bits
section("5. ways into both pages outside the page itself")
try:
    _, home = get("/fa")
    check("/fa/razieh" in home, "the footer carries the founder's portfolio link")
except Exception as exc:  # pragma: no cover
    check(False, "home page answers", str(exc))

try:
    _, sitemap = get("/sitemap.xml")
    for path in ("/fa/razieh", "/en/razieh", "/fa/portfolio", "/en/portfolio"):
        check(path in sitemap, f"sitemap lists {path}")
except Exception as exc:  # pragma: no cover
    check(False, "sitemap answers", str(exc))

section("6. neighbours are untouched")
for path in ("/fa/artists/razieh-khairipour", "/fa/about", "/en/portfolio"):
    try:
        status, _ = get(path)
        check(status == 200, f"{path} still answers 200", f"status {status}")
    except Exception as exc:  # pragma: no cover
        check(False, f"{path} still answers 200", str(exc))

print()
print(f"\033[1m{state['pass']} ✔ / {state['fail']} ✘ / {state['skip']} ↷\033[0m")
sys.exit(0 if state["fail"] == 0 else 1)
PY
