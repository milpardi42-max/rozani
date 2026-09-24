# iransanse-web

The global design system maps **all Persian text** to the font-family `"iransanse-web"`
(see `src/app/globals.css`).

IRANSans is a commercially licensed typeface and cannot be redistributed in this repository.
Drop your licensed files here with the following names and they will be picked up automatically:

| Weight   | File                        |
|----------|-----------------------------|
| Regular  | `IRANSansWeb.woff2`         |
| Medium   | `IRANSansWeb_Medium.woff2`  |
| SemiBold | `IRANSansWeb_SemiBold.woff2`|
| Bold     | `IRANSansWeb_Bold.woff2`    |

Until the licensed files are added, the same file names ship with an OFL-licensed stand-in
(Vazirmatn) so the `iransanse-web` family always resolves and the Persian UI never falls
back to a system font.
