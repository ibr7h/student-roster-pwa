# School Evidence PWA — isolated publishing branch

This branch contains a standalone PWA that does NOT change the student roster application on main.

Deploy with `unzip -q -o site.zip -d public` and publish the `public` directory. All assets are inside `site.zip`.

Security note: this is a local-storage prototype, not a multi-user secure server. Keep student information off it until proper backend authentication is implemented.
