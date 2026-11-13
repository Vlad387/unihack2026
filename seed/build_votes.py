"""Build reproducible SYNTHETIC pitch fixtures; no real citizen votes."""

import argparse
import json
import random
from pathlib import Path

ROOT = Path(__file__).parent
TEXTS = """Terasele ar trebui să închidă la ora 23.
Barurile ar trebui să rămână în centrul orașului.
Liniștea ar trebui să înceapă la ora 22 în fiecare seară.
Localurile bine izolate fonic pot funcționa până la două în weekend.
Ar trebui mai multe coșuri și curățenie finanțată de localuri.
Trebuie redus și zgomotul aprovizionării din timpul zilei.
Concertele în piață ar trebui să fie rare și anunțate din timp.
Cluburile mari ar trebui mutate într-o zonă fără locuințe.
Depășirile repetate ale limitelor de zgomot trebuie sancționate.
Ar trebui testat trei luni un program diferit în weekend.
Închiderea la 23 ar pune în pericol locurile de muncă din baruri.
Investițiile în izolare fonică au nevoie de termene realiste.
Localurile care depășesc repetat limita de zgomot trebuie sancționate.
Terasele ar trebui să poată funcționa până la unu vara.
Aș accepta terase până la 23 și interior până la trei cu pază la ieșire.
O taxă mică și transparentă pentru curățenia de noapte ar fi acceptabilă.
Taxele pentru localuri ar trebui diferențiate după mărime și program.
Angajații și clienții au nevoie de transport public noaptea.
Autorizațiile ar trebui să aibă un program stabil și previzibil.
Localurile ar trebui să ceară clienților să plece fără zgomot.
Ar trebui să existe localuri deschise și după miezul nopții.
Ar trebui să existe autobuze de noapte.
Programul târziu ar trebui permis numai cu izolare fonică bună.
Ar trebui mai multe evenimente culturale accesibile.
Nu ar trebui introduse limite noi de program.
Cluburile ar putea rămâne deschise până la trei în weekend.
Ar trebui îmbunătățit iluminatul și intervenția împotriva hărțuirii.
Transportul spre zonele de petrecere trebuie să fie ieftin.
Concertele ar trebui organizate într-o zonă fără locuințe lângă scenă.
Centrul ar trebui să fie fără sticle sparte dimineața.
Terasele ar trebui închise după zece seara inclusiv în weekend.
Muzica ar trebui dată mai încet după ora 23.
Ar trebui patrule vizibile pe străzile din jurul localurilor.
Transportul de noapte ar trebui să îi deservească și pe angajați.
Festivalurile zgomotoase ar trebui să fie rare și anunțate din timp.
Plecarea grupurilor din zona localurilor trebuie gestionată.
Trotuarele și băncile trebuie să rămână accesibile tuturor.
Localurile cu dans și muzică puternică ar trebui mutate într-o zonă separată.
Concertele mici de jazz ar trebui să rămână în centru.
Vecinii și patronii ar trebui consultați înainte de reguli noi.
Ar trebui să existe baruri deschise târziu în centru.
Ar trebui aplicate limite de zgomot în locul unei ore fixe pentru toate localurile.
Restaurantele liniștite ar trebui să poată servi cina târziu.
Autobuzele de noapte ar trebui să aibă trasee clare pentru vizitatori.
O zonă de petreceri separată ar trebui să fie bine conectată prin transport.
Concertele în aer liber ar putea continua după miezul nopții în unele weekenduri.
Ar trebui mai multe coșuri, toalete publice și curățenie după petreceri.
Regulile ar trebui explicate clar turiștilor în localuri.
Localurile care respectă regulile nu ar trebui sancționate pentru abaterile altora.
Aș accepta terase închise la 23 dacă distracția continuă în interior și există transport.""".splitlines()
QUIET = {1, 3, 4, 6, 7, 8, 9, 23, 29, 31, 32, 35, 37, 38, 42, 50}
LIVELY = {2, 11, 12, 14, 15, 17, 19, 20, 21, 24, 25, 26, 39, 41, 43, 46}
CORE = {1, 3, 8, 38, 14, 21, 25, 46, 22, 27, 37, 47, 49}


def fixtures() -> tuple[list[dict], list[dict]]:
    rows = json.loads((ROOT / "responses.json").read_text())
    assert len(rows) == len(TEXTS) == 50
    assert [r["id"] for r in rows] == [f"seed-{i:03}" for i in range(1, 51)]
    statements = [
        {"id": f"seed-statement-{i:03}", "text": text, "author_id": f"seed-{i:03}"}
        for i, text in enumerate(TEXTS, 1)
    ]
    rng = random.Random(20261114)
    votes = []
    for person in range(1, 51):
        profile = (
            "quiet" if person in QUIET else "lively" if person in LIVELY else "services"
        )
        extras = rng.sample(sorted(set(range(1, 51)) - CORE - {person}), 2)
        for sid in sorted(CORE | set(extras)):
            if sid == person:
                continue
            if sid in {1, 3, 8, 38}:
                agree = {"quiet": 0.94, "lively": 0.06, "services": 0.5}[profile]
                passes = 0.8 if profile == "services" else 0.1
            elif sid in {14, 21, 25, 46}:
                agree = {"quiet": 0.06, "lively": 0.94, "services": 0.5}[profile]
                passes = 0.8 if profile == "services" else 0.1
            elif sid in {22, 27, 37}:
                agree = 0.95 if profile == "services" else 0.8
                passes = 0.1
            elif sid in {47, 49}:
                agree, passes = 0.95, 0.03
            else:
                agree, passes = 0.6, 0.25
            value = (
                "pass"
                if rng.random() < passes
                else ("agree" if rng.random() < agree else "disagree")
            )
            if person in {15, 50} and sid == 1:
                value = "agree"
            votes.append(
                {
                    "participant_id": f"seed-{person:03}",
                    "statement_id": f"seed-statement-{sid:03}",
                    "value": value,
                }
            )
    return statements, votes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Verify fixtures without writing"
    )
    args = parser.parse_args()
    statements, votes = fixtures()
    for name, records in (("statements.json", statements), ("votes.json", votes)):
        target = ROOT / name
        if args.check:
            assert json.loads(target.read_text()) == records, f"Regenerate {name}"
        else:
            lines = [
                ", ".join(json.dumps(r, ensure_ascii=False) for r in records[i : i + 4])
                for i in range(0, len(records), 4)
            ]
            target.write_text("[\n" + ",\n".join(lines) + "\n]\n")
    print(
        f"SYNTHETIC fixtures: {len(statements)} statements, {len(votes)} votes, 50 participants"
    )


if __name__ == "__main__":
    main()
