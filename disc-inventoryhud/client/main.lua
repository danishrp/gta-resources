ESX = nil

local dropSecondaryInventory = {
    type = 'drop',
    owner = 'x123y123z123'
}

Citizen.CreateThread(function()
    while ESX == nil do
        TriggerEvent('esx:getSharedObject', function(obj)
            ESX = obj
        end)
        Citizen.Wait(0)
    end

    while ESX.GetPlayerData().job == nil do
        Citizen.Wait(10)
    end

    ESX.PlayerData = ESX.GetPlayerData()
end)

local isInInventory = false

RegisterNUICallback('NUIFocusOff', function(data)
    closeInventory()
end)

RegisterCommand('closeinv', function(source, args, raw)
    closeInventory()
end)

Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        if IsControlJustReleased(0, Config.OpenControl) and IsInputDisabled(0) then
            local x, y, z = table.unpack(GetEntityCoords(GetPlayerPed(-1)))
            local _, floorZ = GetGroundZFor_3dCoord(x, y, z)
            dropSecondaryInventory.owner = getOwnerFromCoords(vector3(x, y, floorZ))
            openInventory(dropSecondaryInventory)
        end
    end
end
)

AddEventHandler('onResourceStop', function(resource)
    if resource == GetCurrentResourceName() then
        closeInventory()
    end
end)




