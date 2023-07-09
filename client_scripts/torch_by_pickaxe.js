let no_recursion_torch_by_pickaxe = false
ClientEvents.tick(event => {
    if (no_recursion_torch_by_pickaxe) {
        return;
    }
    no_recursion_torch_by_pickaxe = true
    if (Client.mouseHandler.isLeftPressed()) Client.player.sendData('left_clicked', {});
    no_recursion_torch_by_pickaxe = false
})