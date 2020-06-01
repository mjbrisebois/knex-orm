{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  name = "knex-orm";
  src = pkgs.gitignoreSource ./.;

  buildInputs = [
    pkgs.sqlite
  ];

  nativeBuildInputs = [
    pkgs.nodejs-12_x
  ];
}
