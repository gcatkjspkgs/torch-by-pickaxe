let pickaxes = JsonIO.read('kubejs/torch_by_pickaxe_pickaxes.json')

function is_item_includes_tags_or_items(tags_items_dict, item) {
    for (const tag of tags_items_dict['tags']) {
        if (item.hasTag(tag)) {
            return true;
        }
    }
    return tags_items_dict['items'].includes(item.getId());
}

function is_pickaxe(item) {
    return is_item_includes_tags_or_items(pickaxes, item);
}

ItemEvents.clientLeftClicked(event => {
    if (is_pickaxe(Client.player.mainHandItem) && event.hand == 'main_hand') {
        Client.player.sendData('torch_by_pickaxe_left_clicked', {})
    }
})