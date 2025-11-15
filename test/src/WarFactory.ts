// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function OnPlayerJoinGame(eventPlayer: mod.Player) {
    mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.hello, 1));
}