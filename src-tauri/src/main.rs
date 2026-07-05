// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Minimal CLI handling so the binary is well-behaved (and Homebrew's test
    // block can check the version). Any other invocation launches the app.
    if let Some(arg) = std::env::args().nth(1) {
        match arg.as_str() {
            "--version" | "-V" => {
                println!("{} {}", env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"));
                return;
            }
            "--help" | "-h" => {
                println!(
                    "{} {}\nDesktop console for administering a Hanko installation.\n\n\
                     Usage: hanko-admin [--version] [--help]\n\
                     Run with no arguments to launch the app.",
                    env!("CARGO_PKG_NAME"),
                    env!("CARGO_PKG_VERSION")
                );
                return;
            }
            _ => {}
        }
    }
    hanko_admin_lib::run()
}
