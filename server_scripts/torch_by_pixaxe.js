const $UseOnContext = Java.loadClass('net.minecraft.world.item.context.UseOnContext')
const $BlockHitResult = Java.loadClass('net.minecraft.world.phys.BlockHitResult')
const $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $SoundSource = Java.loadClass('net.minecraft.sounds.SoundSource')
const $ChunkPos = Java.loadClass('net.minecraft.world.level.ChunkPos')
const $Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
const $BlockContainerJS = Java.loadClass('dev.latvian.mods.kubejs.level.BlockContainerJS')
const $RayTraceResultJS = Java.loadClass('dev.latvian.mods.kubejs.entity.RayTraceResultJS')
const $ClipContext = Java.loadClass('net.minecraft.world.level.ClipContext')

let torch_id = 'minecraft:torch'
let wall_torch_id = 'minecraft:wall_torch'

let additional_reach_distance = 3

let pickaxes = {
    tags: ['forge:tools/pickaxes', 'forge:tools/paxels', 'c:pickaxes'],
    items: []
}

let originally_can_be_replaced_by_torch = ['minecraft:grass', 'minecraft:fern', 'minecraft:tall_grass', 'minecraft:large_fern']
let additionally_can_be_replaced_by_torch = ['minecraft:seagrass', 'biomesoplenty:huge_clover_petal', 'minecraft:moss_carpet', 'minecraft:sweet_berry_bush', 'projectvibrantjourneys:twigs', 'projectvibrantjourneys:fallen_leaves', 'projectvibrantjourneys:rocks', 'projectvibrantjourneys:mossy_rocks', 'projectvibrantjourneys:sandstone_rocks', 'projectvibrantjourneys:red_sandstone_rocks', 'projectvibrantjourneys:ice_chunks', 'projectvibrantjourneys:bones', 'projectvibrantjourneys:charred_bones', 'projectvibrantjourneys:pinecones', 'projectvibrantjourneys:seashells', 'projectvibrantjourneys:light_brown_bark_mushroom', 'projectvibrantjourneys:bark_mushroom', 'projectvibrantjourneys:orange_bark_mushroom', 'projectvibrantjourneys:glowing_blue_fungus', 'projectvibrantjourneys:dead_fallen_leaves', 'projectvibrantjourneys:prickly_bush', 'projectvibrantjourneys:fallen_leaves', 'projectvibrantjourneys:small_cactus']

let force_gen_sound_items_tags = {
    tags: ['minecraft:flowers', 'forge:mushrooms', 'minecraft:tall_flowers'],
    items: additionally_can_be_replaced_by_torch
}

let can_be_replaced_by_torch = {
    tags: force_gen_sound_items_tags['tags'],
    items: force_gen_sound_items_tags['items'] + originally_can_be_replaced_by_torch
}

let players_already_using_torch_by_pickaxe = []
let players_already_using_torch_by_pickaxe_left_click = []
let players_torch_by_pickaxe_mute_sound = []

function is_item_includes_tags_or_items(tags_items_dict, item) {
    if (item instanceof $BlockContainerJS) {
        item = item.getItem()
    }
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

function is_torch(item) {
    return item == torch_id || item == wall_torch_id
}

function is_can_be_replaced_by_torch(item) {
    return is_item_includes_tags_or_items(can_be_replaced_by_torch, item);
}

function is_force_gen_sound(item) {
    return is_item_includes_tags_or_items(force_gen_sound_items_tags, item);
}

function is_building_block(block) {
    if (block == null) return false
    let cat = block.getItem().getItemCategory()
    if (cat == null) return false
    return cat.getRecipeFolderName() == 'building_blocks'
}

function get_sound_event(item_stack, type) {
    let block = item_stack.getItem().getBlock()
    if (type == 'place') return block.getSoundType(block.defaultBlockState()).getPlaceSound()
    if (type == 'break') return block.getSoundType(block.defaultBlockState()).getBreakSound()
}

function repair_hand_item_count_client_display(hand_item) { //The workaround that fixes the kubejs mod visual bug. This is necessary so that the item is updated and the display starts working correctly again.
    hand_item.setHoverName('Update!')
    Utils.server.scheduleInTicks(1, callback => {
        hand_item.resetHoverName()
    })
}

function can_player_build(player, hand_item, x, y, z) {
    if (Platform.isLoaded("ftbchunks")) {
        let $FTBChunksAPI = Java.loadClass('dev.ftb.mods.ftbchunks.data.FTBChunksAPI')
        let $ChunkDimPos = Java.loadClass('dev.ftb.mods.ftblibrary.math.ChunkDimPos')
        let claimedChunksManager = $FTBChunksAPI.manager
        let chunk = new $ChunkPos(new $BlockPos(x, y, z))
        let player_ftb_chunk = new $ChunkDimPos(player)
        let block_ftb_chunk = player_ftb_chunk.offset(chunk.x - player_ftb_chunk.x, chunk.z - player_ftb_chunk.z)
        let claimedChunk = claimedChunksManager.getChunk(block_ftb_chunk)
        if (claimedChunk != null &&
            !claimedChunk.teamData.isTeamMember(player.uuid) &&
            !claimedChunk.teamData.isAlly(player.uuid) &&
            !claimedChunksManager.getBypassProtection(player.uuid)) {
            repair_hand_item_count_client_display(hand_item) // IDK it's kjs bug or ftbchunks, but if we don't do this, item in client disappears, but only visually.
            return false;
        }
        return true;
    } else {
        return true;
    }
}

function advanced_ray_trace(distance, player, block, fluid) {
    let xRot = player.xRotO
    let yRot = player.yRotO;
    let fromPos = player.getEyePosition(1);
    let x0 = Math.sin(-yRot * 0.017453292519943295 - 3.1415927410125732);
    let z0 = Math.cos(-yRot * 0.017453292519943295 - 3.1415927410125732);
    let y0 = -Math.cos(-xRot * 0.017453292519943295);
    let y = Math.sin(-xRot * 0.017453292519943295);
    let x = x0 * y0;
    let z = z0 * y0;
    let toPos = fromPos.add(x * distance, y * distance, z * distance);
    let hitResult = player.level.clip(new $ClipContext(fromPos, toPos, block, fluid, player));
    return new $RayTraceResultJS(player, hitResult, distance);
}

function process_right_click(event, cancel_event) {
    if (event.hand == 'main_hand' &&
        !is_building_block(event.player.offHandItem) &&
        is_pickaxe(event.player.mainHandItem) &&
        ((event.player.inventory.count(torch_id) >= 2 || (event.player.offHandItem != torch_id && event.player.inventory.count(torch_id) >= 1)) ||
            event.player.getAbilities().instabuild)) {

        if (players_already_using_torch_by_pickaxe.includes(event.player.username)) return;
        players_already_using_torch_by_pickaxe.push(event.player.username)
        event.server.scheduleInTicks(1, callback => {
            players_already_using_torch_by_pickaxe = players_already_using_torch_by_pickaxe.filter((el) => el !== event.player.username);
        })
        if (cancel_event) {
            event.cancel()
        }

        let ray = advanced_ray_trace(event.player.getReachDistance() + additional_reach_distance, event.player, $ClipContext.Block.OUTLINE, $ClipContext.Fluid.NONE)
        if (ray.block == null) {
            return;
        }
        let x = ray.block.x
        let y = ray.block.y
        let z = ray.block.z
        let tmp_x = x
        let tmp_z = z
        let tmp_y = y

        if (!can_player_build(event.player, event.player.mainHandItem, x, y, z)) {
            return;
        }

        let force_gen_sound = false
        let destroy_block = false

        // Compatibility with blocks that logically can be replaced by a torch, but in the original minecraft this feature is not implemented.
        if (is_can_be_replaced_by_torch(ray.block)) {
            // Compatibility with tall grass/flower if we click on the top block.
            if (is_can_be_replaced_by_torch(event.level.getBlock(x, y - 1, z)) &&
                !(ray.block.getId().includes('projectvibrantjourneys:') &&
                    (ray.block.getId().includes('mushroom') || ray.block.getId().includes('fungus'))
                )) {
                y -= 1
                tmp_y -= 1
                force_gen_sound = true
            }
            destroy_block = true
        } else {
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
                destroy_block = true
            }
        }
        if (destroy_block) {
            if (is_force_gen_sound(event.level.getBlock(tmp_x, tmp_y, tmp_z))) {
                force_gen_sound = true
            }
            Utils.server.runCommandSilent(`/execute at ${event.player.uuid} run setblock ${tmp_x} ${tmp_y} ${tmp_z} air destroy`)
        }


        let slot_id = event.player.inventory.find(torch_id)
        if (event.player.offHandItem == torch_id && event.player.offHandItem.count >= 2) {
            slot_id = event.player.inventory.SLOT_OFFHAND
        }
        let torch_itemstack = null
        if (!event.player.getAbilities().instabuild) {
            torch_itemstack = event.player.inventory.getStackInSlot(slot_id)
        } else {
            torch_itemstack = Item.of(torch_id)
        }

        let vec_3 = new $Vec3(x, y, z)
        let block_pos = new $BlockPos(vec_3)
        let block_hit_result = new $BlockHitResult(vec_3, ray.facing, block_pos, false)
        let context = new $UseOnContext(event.player, event.hand, block_hit_result)
        let result = torch_itemstack.getItem().useOn(context)

        if (result.consumesAction()) {
            let sound_event = get_sound_event(torch_itemstack, 'place')
            event.server.scheduleInTicks(1, callback => {
                if (!players_torch_by_pickaxe_mute_sound.includes(event.player.username) || force_gen_sound) {
                    event.level.playSound(null, block_pos, sound_event, $SoundSource.BLOCKS, 1.0, 0.8)
                }
            })

            if (context.getItemInHand().isEmpty()) context.getItemInHand().grow(1);
            if (!event.player.getAbilities().instabuild) torch_itemstack.shrink(1);
        }
    }
}

ItemEvents.rightClicked(event => {
    process_right_click(event, false)
    if (event.player.offHandItem == torch_id && event.player.offHandItem.count == 1 && (event.player.inventory.count(torch_id) >= 2 || event.player.getAbilities().instabuild)) {
        event.server.runCommandSilent(`title ${event.player.username} actionbar " "`) //Compatibility with Client Tweaks mod
    }
})

BlockEvents.rightClicked(event => {
    if (!is_pickaxe(event.player.mainHandItem)) return;
    if (event.block.getId().startsWith('projectvibrantjourneys:')) {
        process_right_click(event, true)
    }
    if (event.player.offHandItem == torch_id) {
        if (event.hand == 'off_hand') {
            players_torch_by_pickaxe_mute_sound.push(event.player.username)
            event.server.scheduleInTicks(1, callback => {
                players_torch_by_pickaxe_mute_sound = players_torch_by_pickaxe_mute_sound.filter((el) => el !== event.player.username);
            })
            event.cancel()
            repair_hand_item_count_client_display(event.player.offHandItem)
        }
    }
    if (!event.player.stages.has('notified_about_torch')) {
        event.player.stages.add('notified_about_torch')
        event.player.tell(`In this modpack you don't need to hold torch in off hand with pickaxe in main hand to place torch. You can place torches directly from inventory. Also, breaking the torch with a pickaxe will lead to an instantaneous picking up of the torch. You don't have to run for it to pick up. Also, for convenience, the distance of placing / breaking the torch has been increased by ${additional_reach_distance}.`)
    }
})

function break_torch(player, x, y, z, drop, sound) {
    if (sound) {
        let sound_event = get_sound_event(Item.of(torch_id), 'break')
        player.level.playSound(null, new $BlockPos(x, y, z), sound_event, $SoundSource.BLOCKS, 1.0, 0.8)
    }
    let destroy_string = ""
    if (drop) {
        destroy_string = " destroy"
    }
    Utils.server.runCommandSilent(`/execute at ${player.uuid} run setblock ${x} ${y} ${z} air${destroy_string}`)
}

function process_pickaxe_left_click(event, event_type) {
    if (players_already_using_torch_by_pickaxe_left_click.includes(event.player.username)) return;
    if (!is_pickaxe(event.player.mainHandItem)) return;


    let block = null
    if (event_type == 'client') {
        let ray = advanced_ray_trace(event.player.getReachDistance() + additional_reach_distance, event.player, $ClipContext.Block.OUTLINE, $ClipContext.Fluid.NONE)
        block = ray.block
    } else if (event_type == 'block') {
        block = event.block
    }
    if (block == null) return;
    if (is_torch(block)) {
        if (event_type != 'client') {
            event.cancel()
        }
    } else return;

    let x = block.x
    let y = block.y
    let z = block.z

    if (!can_player_build(event.player, event.player.mainHandItem, x, y, z)) {
        return;
    }

    players_already_using_torch_by_pickaxe_left_click.push(event.player.username)
    event.server.scheduleInTicks(1, callback => {
        players_already_using_torch_by_pickaxe_left_click = players_already_using_torch_by_pickaxe_left_click.filter((el) => el !== event.player.username);
    })

    let play_sound = event_type == 'client'

    if (event.player.getAbilities().instabuild) {
        break_torch(event.player, x, y, z, false, play_sound)
        return;
    }

    let slot = event.player.inventory.getSlotWithRemainingSpace(Item.of(torch_id))
    if (slot == -1) {
        slot = event.player.inventory.getFreeSlot()
    }
    if (slot != -1) {
        let count = event.player.inventory.getItem(slot).count
        event.player.inventory.setStackInSlot(slot, Item.of(`${count + 1}x ${torch_id}`));
        break_torch(event.player, x, y, z, false, play_sound)
        return;
    }
    break_torch(event.player, x, y, z, true, false)
}

BlockEvents.leftClicked(event => {
    process_pickaxe_left_click(event, 'block')
})

NetworkEvents.fromClient('left_clicked', event => {
    process_pickaxe_left_click(event, 'client')
})
