{ pkgs ? import <nixpkgs> {} }:

let
  package = {
    project = (import ./. {});
  };
in
  pkgs.mkShell {
    inputsFrom = pkgs.lib.attrValues package;
  }
