mod commands;
mod provider;
mod session;

use session::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::connect,
            commands::disconnect,
            commands::is_connected,
            commands::connection_info,
            commands::admin_request,
            commands::cli_check,
            commands::cli_login,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
