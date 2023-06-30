ItemEvents.clientLeftClicked(event => {
    if (event.hand == 'main_hand') {
        Client.player.sendData('left_clicked', {})
    }
})