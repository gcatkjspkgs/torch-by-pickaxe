const $UseOnContext = Java.loadClass('net.minecraft.world.item.context.UseOnContext')
const $BlockHitResult = Java.loadClass('net.minecraft.world.phys.BlockHitResult')
const $Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
const $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $Items = Java.loadClass('net.minecraft.world.item.Items')

let pickaxe_tags = ['forge:tools/pickaxes', 'forge:tools/paxels', 'c:pickaxes']

function is_pickaxe(item) {
    for (const tag of pickaxe_tags) {
        if (item.hasTag(tag)) {
            return true
        }
    }
    return false
}

ItemEvents.rightClicked(event => {
    if (event.hand == 'main_hand' &&
        is_pickaxe(event.player.mainHandItem) &&
        (event.player.inventory.count('minecraft:torch') >= 2 || (event.player.offHandItem != 'minecraft:torch' && event.player.inventory.count('minecraft:torch') >= 1))) {
        let ray = event.player.rayTrace(8)
        if (ray.block == null) {
            return;
        }
        let x = ray.block.x
        let y = ray.block.y
        let z = ray.block.z

        let vec_3 = new $Vec3(x, y, z)
        let block_pos = new $BlockPos(x, y, z)
        let block_hit_result = new $BlockHitResult(vec_3, ray.facing, block_pos, false)
        let context = new $UseOnContext(event.player, event.hand, block_hit_result)
        let items = new $Items()
        let result = items.TORCH.useOn(context)

        if (result.consumesAction()) {
            if (context.getItemInHand().isEmpty()) context.getItemInHand().grow(1);
            let slot_id = event.player.inventory.find('minecraft:torch')
            if (event.player.offHandItem == 'minecraft:torch' && event.player.offHandItem.count >= 2) {
                slot_id = 40
            }
            event.player.inventory.extractItem(slot_id, 1, false)
        }
    }
})

BlockEvents.rightClicked(event => {
    if (is_pickaxe(event.player.mainHandItem) &&
        event.player.offHandItem == 'minecraft:torch') {
        if (event.hand == 'off_hand') {
            event.cancel()
            event.player.offHandItem.setHoverName('Torch!') //The workaround that fixes the kubejs mod visual bug. This is necessary so that the item is updated and the display starts working correctly again.
            event.server.scheduleInTicks(1, callback => {
                event.player.offHandItem.resetHoverName()
            })
        } else if (!event.player.stages.has('notified_about_torch')) {
            event.player.stages.add('notified_about_torch')
            event.player.tell("In this modpack you don't need to hold torch in off hand with pickaxe in main hand to place torch! You can place torches directly from inventory!")
        }
    }
})
