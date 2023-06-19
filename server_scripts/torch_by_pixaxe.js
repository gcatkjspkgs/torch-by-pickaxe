const $UseOnContext = Java.loadClass('net.minecraft.world.item.context.UseOnContext')
const $BlockHitResult = Java.loadClass('net.minecraft.world.phys.BlockHitResult')
const $Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
const $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $SoundSource = Java.loadClass('net.minecraft.sounds.SoundSource')

let torch_id = 'minecraft:torch'

let pickaxes = {
    tags: ['forge:tools/pickaxes', 'forge:tools/paxels', 'c:pickaxes'],
    items: []
}
let can_be_replaced_by_torch = {
    tags: ['minecraft:flowers', 'forge:mushrooms', 'minecraft:tall_flowers'],
    items: ['projectvibrantjourneys:fallen_leaves', 'minecraft:tall_grass', 'minecraft:large_fern', 'minecraft:grass', 'minecraft:fern', 'projectvibrantjourneys:light_brown_bark_mushroom', 'projectvibrantjourneys:bark_mushroom', 'projectvibrantjourneys:orange_bark_mushroom', 'projectvibrantjourneys:glowing_blue_fungus', 'projectvibrantjourneys:dead_fallen_leaves', 'projectvibrantjourneys:prickly_bush', 'minecraft:sweet_berry_bush', 'minecraft:moss_carpet', 'biomesoplenty:huge_clover_petal', "projectvibrantjourneys:twigs", "projectvibrantjourneys:fallen_leaves", "projectvibrantjourneys:rocks", "projectvibrantjourneys:mossy_rocks", "projectvibrantjourneys:sandstone_rocks", "projectvibrantjourneys:red_sandstone_rocks", "projectvibrantjourneys:ice_chunks", "projectvibrantjourneys:bones", "projectvibrantjourneys:charred_bones", "projectvibrantjourneys:pinecones", "projectvibrantjourneys:seashells"]
}

let players_already_using_torch_by_pickaxe = []

function is_item_includes_tags_or_items(tags_items_dict, item) {
    for (const tag of tags_items_dict["tags"]) {
        if (item.hasTag(tag)) {
            return true;
        }
    }
    return tags_items_dict["items"].includes(item.getId());
}

function is_pickaxe(item) {
    return is_item_includes_tags_or_items(pickaxes, item);
}

function is_can_be_replaced_by_torch(item) {
    return is_item_includes_tags_or_items(can_be_replaced_by_torch, item);
}

function is_building_block(block) {
    if (block == null) return false
    let cat = block.getItem().getItemCategory()
    if (cat == null) return false
    return cat.getRecipeFolderName() == 'building_blocks'
}

function repair_off_hand_item_count_client_display(event) { //The workaround that fixes the kubejs mod visual bug. This is necessary so that the item is updated and the display starts working correctly again.
    event.player.offHandItem.setHoverName('Torch!')
    event.server.scheduleInTicks(1, callback => {
        event.player.offHandItem.resetHoverName()
    })
}

function process_right_click(event, is_block_right_click) {
    if (event.hand == 'main_hand' &&
        !is_building_block(event.player.offHandItem) &&
        is_pickaxe(event.player.mainHandItem) &&
        (event.player.inventory.count(torch_id) >= 2 || (event.player.offHandItem != torch_id && event.player.inventory.count(torch_id) >= 1))) {

        if (players_already_using_torch_by_pickaxe.includes(event.player.username)) return;
        players_already_using_torch_by_pickaxe.push(event.player.username)
        event.server.scheduleInTicks(1, callback => {
            players_already_using_torch_by_pickaxe = players_already_using_torch_by_pickaxe.filter((el) => el !== event.player.username);
        })

        let ray = event.player.rayTrace(event.player.getReachDistance() + 3)
        if (ray.block == null) {
            return;
        }
        let x = ray.block.x
        let y = ray.block.y
        let z = ray.block.z

        // Compatibility with blocks that logically can be replaced by a torch, but in the original minecraft this feature is not implemented.
        if (is_can_be_replaced_by_torch(ray.block)) {
            // Compatibility with tall grass/flower if we click on the top block.
            if (is_can_be_replaced_by_torch(event.level.getBlock(x, y - 1, z))) {
                y -= 1
            }
            Utils.server.runCommandSilent(`/execute at ${event.player.uuid} run setblock ${x} ${y} ${z} air destroy`)
        } else {
            let tmp_x = x
            let tmp_z = z
            let tmp_y = y
            switch (ray.facing) {
                case 'east':
                    tmp_x += 1
                    break;
                case 'south':
                    tmp_z += 1
                    break;
                case 'north':
                    tmp_z -= 1
                    break;
                case 'west':
                    tmp_x -= 1
                    break;
                case 'up':
                    tmp_y += 1
                    break;
            }
            if (is_can_be_replaced_by_torch(event.level.getBlock(tmp_x, tmp_y, tmp_z))) {
                Utils.server.runCommandSilent(`/execute at ${event.player.uuid} run setblock ${tmp_x} ${tmp_y} ${tmp_z} air destroy`)
            }
        }

        let slot_id = event.player.inventory.find(torch_id)
        let gen_sound = true
        if (event.player.offHandItem == torch_id && event.player.offHandItem.count >= 2) {
            slot_id = event.player.inventory.SLOT_OFFHAND
            if (is_block_right_click) {
                gen_sound = false
            }
        }
        let torch_itemstack = event.player.inventory.getStackInSlot(slot_id)

        let vec_3 = new $Vec3(x, y, z)
        let block_pos = new $BlockPos(x, y, z)
        let block_hit_result = new $BlockHitResult(vec_3, ray.facing, block_pos, false)
        let context = new $UseOnContext(event.player, event.hand, block_hit_result)
        let result = torch_itemstack.getItem().useOn(context)

        if (result.consumesAction()) {
            if (context.getItemInHand().isEmpty()) context.getItemInHand().grow(1);
            if (!event.player.getAbilities().instabuild) torch_itemstack.shrink(1);
            if (gen_sound) {
                let block = torch_itemstack.getItem().getBlock()
                let sound_event = block.getSoundType(block.defaultBlockState()).getPlaceSound()
                event.level.playSound(null, block_pos, sound_event, $SoundSource.BLOCKS, 1.0, 0.8)
            }
            event.cancel()
        }
    }
}

ItemEvents.rightClicked(event => {
    process_right_click(event, false)
})

BlockEvents.rightClicked(event => {
    if (!is_pickaxe(event.player.mainHandItem)) return;
    process_right_click(event, true)
    if (event.player.offHandItem == torch_id) {
        if (event.hand == 'off_hand') {
            event.cancel()
            repair_off_hand_item_count_client_display(event)
        } else if (!event.player.stages.has('notified_about_torch')) {
            event.player.stages.add('notified_about_torch')
            event.player.tell("In this modpack you don't need to hold torch in off hand with pickaxe in main hand to place torch! You can place torches directly from inventory!")
        }
    }
})
