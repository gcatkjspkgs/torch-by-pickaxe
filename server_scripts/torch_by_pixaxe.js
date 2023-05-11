const $UseOnContext = Java.loadClass('net.minecraft.world.item.context.UseOnContext')
const $BlockHitResult = Java.loadClass('net.minecraft.world.phys.BlockHitResult')
const $Vec3 = Java.loadClass('net.minecraft.world.phys.Vec3')
const $BlockPos = Java.loadClass('net.minecraft.core.BlockPos')
const $Items = Java.loadClass('net.minecraft.world.item.Items')


ItemEvents.rightClicked(event => {
    if (event.hand == 'main_hand' && (event.player.mainHandItem.hasTag('forge:tools/pickaxes') || event.player.mainHandItem.hasTag('forge:tools/paxels')) &&
        (event.player.inventory.count('minecraft:torch') >= 2 || (event.player.offHandItem != "minecraft:torch" && event.player.inventory.count('minecraft:torch') >= 1))) {
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
            event.player.inventory.extractItem(event.player.inventory.find('minecraft:torch'), 1, false)
        }
    }
})

BlockEvents.rightClicked(event => {
    if (event.hand == 'main_hand' && (event.player.mainHandItem.hasTag('forge:tools/paxels') || event.player.mainHandItem.hasTag('forge:tools/pickaxes')) &&
        (event.player.inventory.count('minecraft:torch') >= 2 || (event.player.offHandItem != "minecraft:torch" && event.player.inventory.count('minecraft:torch') >= 1))) {
        if (!event.player.stages.has('notified_about_torch') && event.player.offHandItem == "minecraft:torch") {
            event.player.stages.add('notified_about_torch')
            event.player.tell("In this modpack you don't need to hold torch in off hand with pickaxe in main hand to place torch! You can place torches directly from inventory!")
        }
    }
})