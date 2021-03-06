var type = "normal";
var firstTier = 1;
var firstUsed = 0;
var firstItems = new Array();
var secondTier = 1;
var secondUsed = 0;
var secondItems = new Array();
var errorHighlightTimer = null;

var dragging = false
var origDrag = null;
var draggingItem = null;
var mousedown = false;
var docWidth = document.documentElement.clientWidth;
var docHeight = document.documentElement.clientHeight;
var offset = [76, 81];
var cursorX = docWidth / 2;
var cursorY = docHeight / 2;

var successAudio = document.createElement('audio');
successAudio.controls = false;
successAudio.volume = 0.25;
successAudio.src = './success.wav';

var failAudio = document.createElement('audio');
failAudio.controls = false;
failAudio.volume = 0.1;
failAudio.src = './fail.wav';

window.addEventListener("message", function (event) {
    if (event.data.action == "display") {
        type = event.data.type;

        if (type === "normal") {
            $('#inventoryTwo').parent().hide();
        } else if (type === "secondary") {
            $('#inventoryTwo').parent().show();
        }

        $(".ui").fadeIn();
    } else if (event.data.action == "hide") {
        $("#dialog").dialog("close");
        $(".ui").fadeOut();
    } else if (event.data.action == "setItems") {
        firstTier = event.data.invTier;
        inventorySetup(event.data.invOwner, event.data.itemList, event.data.money, event.data.invTier);
    } else if (event.data.action == "setSecondInventoryItems") {
        secondTier = event.data.invTier;
        secondInventorySetup(event.data.invOwner, event.data.itemList, event.data.invTier);
    } else if (event.data.action == "setInfoText") {
        $(".info-div").html(event.data.text);
    } else if (event.data.action == "nearPlayersGive" || event.data.action == "nearPlayersPay") {
        $("#nearPlayers").html("");

        $.each(event.data.players, function (index, player) {
            $("#nearPlayers").append('<button class="nearbyPlayerButton" data-player="' + player.player + '">' + player.label + ' (' + player.player + ')</button>');
        });

        $("#dialog").dialog("open");
        let count = parseInt($("#count").val());


        $(".nearbyPlayerButton").click(function () {
            $("#dialog").dialog("close");
            player = $(this).data("player");
            if (event.data.action == "nearPlayersGive") {
                $.post("http://disc-inventoryhud/GiveItem", JSON.stringify({
                    player: player,
                    item: event.data.item,
                    number: count
                }));
            } else if (event.data.action == "nearPlayersPay") {
                $.post("http://disc-inventoryhud/GiveCash", JSON.stringify({
                    player: player,
                    item: 'cash',
                    number: count
                }));
            }
        });
    }
});

function formatCurrency(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function EndDragging() {
    $(origDrag).removeClass('orig-dragging');
    $("#use").removeClass("disabled");
    $("#drop").removeClass("disabled");
    $("#give").removeClass("disabled");
    $(draggingItem).remove();
    origDrag = null;
    draggingItem = null;
    dragging = false;
}

function closeInventory() {
    InventoryLog('Closing');
    EndDragging();
    $.post("http://disc-inventoryhud/NUIFocusOff", JSON.stringify({}));
}

function inventorySetup(invOwner, items, money, invTier) {
    setupPlayerSlots();
    $('#player-inv-label').html(firstTier.label);
    $('#player-inv-id').html(invOwner);
    $('#inventoryOne').data('invOwner', invOwner);
    $('#inventoryOne').data('invTier', invTier);

    $('#cash').html('<img src="img/cash.png" class="moneyIcon"> $' + formatCurrency(money.cash));
    $('#bank').html('<img src="img/bank.png" class="moneyIcon"> $' + formatCurrency(money.bank));

    firstUsed = 0;
    $.each(items, function (index, item) {
        var slot = $('#inventoryOne').find('.slot').filter(function () {
            return $(this).data('slot') === item.slot;
        });
        firstUsed++;
        var slotId = $(slot).data('slot');
        firstItems[slotId] = item;
        AddItemToSlot(slot, item);
    });

    $('#player-used').html(firstUsed);
    $("#inventoryOne > .slot:lt(5) .item").append('<div class="item-keybind"></div>');

    $('#inventoryOne .item-keybind').each(function (index) {
        $(this).html(index + 1);
    })
}

function secondInventorySetup(invOwner, items, invTier) {
    setupSecondarySlots(invOwner);
    $('#other-inv-label').html(secondTier.label);
    $('#other-inv-id').html(invOwner);
    $('#inventoryTwo').data('invOwner', invOwner);
    $('#inventoryTwo').data('invTier', invTier);
    secondUsed = 0;
    $.each(items, function (index, item) {
        var slot = $('#inventoryTwo').find('.slot').filter(function () {
            return $(this).data('slot') === item.slot;
        });
        secondUsed++;
        var slotId = $(slot).data('slot');
        secondItems[slotId] = item;
        AddItemToSlot(slot, item);
    });

    $('#other-used').html(secondUsed);
}

function setupPlayerSlots() {
    $('#inventoryOne').html("");
    $('#player-inv-id').html("");
    $('#inventoryOne').removeData('invOwner');
    $('#inventoryOne').removeData('invTier');
    $('#player-max').html(firstTier.slots);
    for (i = 1; i <= (firstTier.slots); i++) {
        $("#inventoryOne").append($('.slot-template').clone());
        $('#inventoryOne').find('.slot-template').data('slot', i);
        $('#inventoryOne').find('.slot-template').data('inventory', 'inventoryOne');
        $('#inventoryOne').find('.slot-template').removeClass('slot-template');
    }
    ;
}

function setupSecondarySlots(owner) {
    $('#inventoryTwo').html("");
    $('#other-inv-id').html("");
    $('#inventoryTwo').removeData('invOwner');
    $('#inventoryTwo').removeData('invTier');
    $('#other-max').html(secondTier.slots);
    for (i = 1; i <= (secondTier.slots); i++) {
        $("#inventoryTwo").append($('.slot-template').clone());
        $('#inventoryTwo').find('.slot-template').data('slot', i);
        $('#inventoryTwo').find('.slot-template').data('inventory', 'inventoryTwo');

        if (owner.startsWith("drop") || owner.startsWith("container") || owner.startsWith("car") || owner.startsWith("pd-trash")) {
            $('#inventoryTwo').find('.slot-template').addClass('temporary');
        } else if (owner.startsWith("pv") || owner.startsWith("stash")) {
            $('#inventoryTwo').find('.slot-template').addClass('storage');
        } else if (owner.startsWith("steam")) {
            $('#inventoryTwo').find('.slot-template').addClass('player');
        } else if (owner.startsWith("pd-evidence")) {
            $('#inventoryTwo').find('.slot-template').addClass('evidence');
        }

        $('#inventoryTwo').find('.slot-template').removeClass('slot-template');
    }
}

document.addEventListener('mousemove', function (event) {
    event.preventDefault();
    cursorX = event.clientX;
    cursorY = event.clientY;
    if (dragging) {
        if (draggingItem !== undefined && draggingItem !== null) {
            draggingItem.css('left', (cursorX - offset[0]) + 'px');
            draggingItem.css('top', (cursorY - offset[1]) + 'px');
        }
    }
}, true);

$('#count').on('keyup blur', function (e) {
    if ((e.which == 8 || e.which == undefined || e.which == 0)) {
        e.preventDefault();
    }

    if ($(this).val() == '') {
        $(this).val('0');
    } else {
        $(this).val(parseInt($(this).val()))
    }
});

$(document).ready(function () {
    $('#inventoryTwo').parent().hide();

    $('#inventoryOne, #inventoryTwo').on('click', '.slot', function (e) {
        itemData = $(this).find('.item').data('item');
        if (itemData == null && !dragging) {
            return
        }
        ;

        if (dragging) {
            if ($(this).data('slot') !== undefined && $(origDrag).data('slot') !== $(this).data('slot') || $(this).data('slot') !== undefined && $(origDrag).data('invOwner') !== $(this).parent().data('invOwner')) {
                if ($(this).find('.item').data('item') !== undefined) {
                    AttemptDropInOccupiedSlot(origDrag, $(this), parseInt($("#count").val()))
                } else {
                    AttemptDropInEmptySlot(origDrag, $(this), parseInt($("#count").val()));
                }
            } else {
                successAudio.play();
            }
            EndDragging();
        } else {
            if (itemData !== undefined) {
                // Store a reference because JS is retarded
                origDrag = $(this)
                AddItemToSlot(origDrag, itemData);
                $(origDrag).data('slot', $(this).data('slot'));
                $(origDrag).data('invOwner', $(this).parent().data('invOwner'));
                $(origDrag).addClass('orig-dragging');

                // Clone this shit for dragging
                draggingItem = $(this).clone();
                AddItemToSlot(draggingItem, itemData);
                $(draggingItem).data('slot', $(this).data('slot'));
                $(draggingItem).data('invOwner', $(this).parent().data('invOwner'));
                $(draggingItem).addClass('dragging');

                $(draggingItem).css('pointer-events', 'none');
                $(draggingItem).css('left', (cursorX - offset[0]) + 'px');
                $(draggingItem).css('top', (cursorY - offset[1]) + 'px');
                $('.ui').append(draggingItem);


                if (!itemData.usable) {
                    $("#use").addClass("disabled");
                }

                if (!itemData.canRemove) {
                    $("#drop").addClass("disabled");
                    $("#give").addClass("disabled");
                }
            }
            dragging = true;
        }

    });

    $('.close-ui').click(function (event, ui) {
        closeInventory();
    })

    $('#use').click(function (event, ui) {
        if (dragging) {
            itemData = $(draggingItem).find('.item').data("item");
            if (itemData.usable) {
                InventoryLog('Using ' + itemData.label);
                $.post("http://disc-inventoryhud/UseItem", JSON.stringify({
                    owner: $(draggingItem).parent().data('invOwner'),
                    item: itemData
                }), function (closeUi) {
                    if (closeUi) {
                        closeInventory();
                    }
                });
                successAudio.play();
            } else {
                failAudio.play();
            }
            EndDragging();
        }
    });

    $("#use").mouseenter(function () {
        if (!$(this).hasClass('disabled')) {
            $(this).addClass('hover');
        }
    }).mouseleave(function () {
        $(this).removeClass('hover');
    });

    $('#give').click(function (event, ui) {
        if (dragging) {
            itemData = $(draggingItem).find('.item').data("item");
            let count = parseInt($("#count").val());
            if (itemData.canRemove) {
                InventoryLog('Giving ' + count + ' ' + itemData.label + ' To Nearby Player');
                $.post("http://disc-inventoryhud/GetNearPlayers", JSON.stringify({
                    action: 'give',
                    item: itemData
                }));
                successAudio.play();
            } else {
                failAudio.play();
            }
            EndDragging();
        }
    });

    $("#give").mouseenter(function () {
        if (!$(this).hasClass('disabled')) {
            $(this).addClass('hover');
        }
    }).mouseleave(function () {
        $(this).removeClass('hover');
    });

    let pay = $("#pay");
    pay.mouseenter(function () {
        if (!$(this).hasClass('disabled')) {
            $(this).addClass('hover');
        }
    }).mouseleave(function () {
        $(this).removeClass('hover');
    });

    pay.click(function (event, ui) {
        $.post("http://disc-inventoryhud/GetNearPlayers", JSON.stringify({
            action: 'pay',
            item: 'cash',
        }));
    });

    $('#drop').click(function (event, ui) {
        if (dragging) {
            itemData = $(draggingItem).find('.item').data("item");
            let dropCount = parseInt($("#count").val());

            if (dropCount === 0 || dropCount > itemData.qty) {
                dropCount = itemData.qty
            }

            if (itemData.canRemove) {
                InventoryLog('Dropping ' + dropCount + ' ' + itemData.label + ' On Ground');
                $.post("http://disc-inventoryhud/DropItem", JSON.stringify({
                    item: itemData,
                    qty: dropCount
                }));
                successAudio.play();
            } else {
                failAudio.play();
            }
            EndDragging();
        }
    });

    $("#drop").mouseenter(function () {
        if (!$(this).hasClass('disabled')) {
            $(this).addClass('hover');
        }
    }).mouseleave(function () {
        $(this).removeClass('hover');
    });

    $('#inventoryOne, #inventoryTwo').on('mouseenter', '.slot', function () {
        var itemData = $(this).find('.item').data('item');
        if (itemData !== undefined) {
            $('.tooltip-div').find('.tooltip-name').html(itemData.label);

            if (itemData.unique === 0) {
                if (itemData.stackable) {
                    $('.tooltip-div').find('.tooltip-uniqueness').html("Not Unique - Stack Max(" + itemData.max + ")");
                } else {
                    $('.tooltip-div').find('.tooltip-uniqueness').html("Not Unique - Not Stackable");
                }
            } else {
                $('.tooltip-div').find('.tooltip-uniqueness').html("Unique (" + itemData.max + ")");
            }

            if (itemData.staticMeta !== undefined || itemData.staticMeta !== "") {
                if (itemData.type === 1) {
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Registered Owner</div> : <div class="meta-val">' + itemData.staticMeta.owner + '</div></div>');
                } else if (itemData.itemId === 'license') {
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Name</div> : <div class="meta-val">' + itemData.staticMeta.name + '</div></div>');
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Issued On</div> : <div class="meta-val">' + itemData.staticMeta.issuedDate + '</div></div>');
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Height</div> : <div class="meta-val">' + itemData.staticMeta.height + '</div></div>');
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Date of Birth</div> : <div class="meta-val">' + itemData.staticMeta.dob + '</div></div>');
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Phone Number</div> : <div class="meta-val">' + itemData.staticMeta.phone + '</div></div>');
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Citizen ID</div> : <div class="meta-val">' + itemData.staticMeta.id + '-' + itemData.staticMeta.user + '</div></div>');

                    if (itemData.staticMeta.endorsements !== undefined) {
                        $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key">Endorsement</div> : <div class="meta-val">' + itemData.staticMeta.endorsements + '</div></div>');
                    }
                } else if (itemData.itemId === 'gold') {
                    $('.tooltip-div').find('.tooltip-meta').append('<div class="meta-entry"><div class="meta-key"></div> : <div class="meta-val">This Bar Has A Serial Number Engraved Into It Registered To San Andreas Federal Reserve</div></div>');
                }
            } else {
                $('.tooltip-div').find('.tooltip-meta').html("This Item Has No Information");
            }
            $('.tooltip-div').show();
        }
    });

    $('#inventoryOne, #inventoryTwo').on('mouseleave', '.slot', function () {
        $('.tooltip-div').hide();
        $('.tooltip-div').find('.tooltip-name').html("");
        $('.tooltip-div').find('.tooltip-uniqueness').html("");
        $('.tooltip-div').find('.tooltip-meta').html("");
    });

    $("body").on("keyup", function (key) {
        if (Config.closeKeys.includes(key.which)) {
            closeInventory();
        }

        if (key.which === 69) {
            if (type === "trunk") {
                closeInventory();
            }
        }
    });
});

function AttemptDropInEmptySlot(origin, destination, moveQty) {
    var result = ErrorCheck(origin, destination, moveQty)
    if (result === -1) {
        $('.slot.error').removeClass('error');
        var item = origin.find('.item').data('item');

        if (item == null) {
            return;
        }

        if (moveQty > item.qty || moveQty === 0) {
            moveQty = item.qty;
        }

        if (moveQty === item.qty) {
            ResetSlotToEmpty(origin);
            item.slot = destination.data('slot');
            AddItemToSlot(destination, item);
            successAudio.play();

            InventoryLog('Moving ' + item.qty + ' ' + item.label + ' ' + ' From ' + origin.data('invOwner') + ' Slot ' + origin.data('slot') + ' To ' + destination.parent().data('invOwner') + ' Slot ' + item.slot);
            $.post("http://disc-inventoryhud/MoveToEmpty", JSON.stringify({
                originOwner: origin.parent().data('invOwner'),
                originSlot: origin.data('slot'),
                originTier: origin.parent().data('invTier'),
                originItem: item,
                destinationOwner: destination.parent().data('invOwner'),
                destinationType: destination.find('.item').data('invType'),
                destinationSlot: item.slot,
                destinationTier: destination.parent().data('invTier'),
                destinationItem: destination.find('.item').data('item'),
            }));
        } else {
            var item2 = Object.create(item);
            item2.slot = destination.data('slot');
            item2.qty = moveQty;
            item.qty = item.qty - moveQty;
            AddItemToSlot(origin, item);
            AddItemToSlot(destination, item2);
            successAudio.play();

            InventoryLog('Empty: Moving ' + moveQty + ' ' + item.label + ' From ' + origin.data('invOwner') + ' Slot ' + item.slot + ' To ' + destination.parent().data('invOwner') + ' Slot ' + item2.slot);
            $.post("http://disc-inventoryhud/EmptySplitStack", JSON.stringify({
                originOwner: origin.parent().data('invOwner'),
                originSlot: origin.data('slot'),
                originTier: origin.parent().data('invTier'),
                originItem: origin.find('.item').data('item'),
                destinationOwner: destination.parent().data('invOwner'),
                destinationSlot: item2.slot,
                destinationTier: destination.parent().data('invTier'),
                destinationItem: destination.find('.item').data('item'),
                moveQty: moveQty,
            }));
        }
    } else {
        failAudio.play();
        if (result === 1) {
            origin.addClass('error');
            setTimeout(function () {
                origin.removeClass('error');
            }, 1000);
            destination.addClass('error');
            setTimeout(function () {
                destination.removeClass('error');
            }, 1000);
            InventoryLog("Destination Inventory Owner Was Undefined");
        }
    }
}

function AttemptDropInOccupiedSlot(origin, destination, moveQty) {
    var result = ErrorCheck(origin, destination, moveQty);

    var originItem = origin.find('.item').data('item');
    var destinationItem = destination.find('.item').data('item');

    if (originItem == undefined || destinationItem == undefined) {
        return;
    }

    if (result === -1) {
        $('.slot.error').removeClass('error');
        if (originItem.itemId === destinationItem.itemId && destinationItem.stackable) {
            if (moveQty > originItem.qty || moveQty === 0) {
                moveQty = originItem.qty;
            }

            if (moveQty != originItem.qty && destinationItem.qty + moveQty <= destinationItem.max) {
                originItem.qty -= moveQty;
                destinationItem.qty += moveQty;
                AddItemToSlot(origin, originItem);
                AddItemToSlot(destination, destinationItem);

                successAudio.play();
                InventoryLog('Non-Empty: Moving ' + moveQty + ' ' + originItem.label + ' In ' + origin.data('invOwner') + ' Slot ' + originItem.slot + ' To ' + destination.parent().data('invOwner') + ' Slot' + destinationItem.slot);
                $.post("http://disc-inventoryhud/SplitStack", JSON.stringify({
                    originOwner: origin.parent().data('invOwner'),
                    originTier: origin.parent().data('invTier'),
                    originSlot: originItem.slot,
                    originItem: originItem,
                    destinationOwner: destination.parent().data('invOwner'),
                    destinationSlot: destinationItem.slot,
                    destinationTier: destination.parent().data('invTier'),
                    moveQty: moveQty,
                }));
            } else {
                if (destinationItem.qty === destinationItem.max) {
                    destinationItem.slot = origin.data('slot')
                    originItem.slot = destination.data('slot');

                    ResetSlotToEmpty(origin);
                    AddItemToSlot(origin, destinationItem);
                    ResetSlotToEmpty(destination);
                    AddItemToSlot(destination, originItem);
                    successAudio.play();

                    InventoryLog('Swapping ' + originItem.label + ' In  ' + destination.parent().data('invOwner') + ' Slot ' + originItem.slot + ' With ' + destinationItem.label + ' In ' + origin.data('invOwner') + ' Slot ' + destinationItem.slot);
                    $.post("http://disc-inventoryhud/SwapItems", JSON.stringify({
                        originOwner: origin.parent().data('invOwner'),
                        originItem: origin.find('.item').data('item'),
                        destinationOwner: destination.parent().data('invOwner'),
                        destinationItem: destination.find('.item').data('item'),
                    }));
                } else if (originItem.qty + destinationItem.qty <= destinationItem.max) {
                    ResetSlotToEmpty(origin);
                    destinationItem.qty += originItem.qty;
                    AddItemToSlot(destination, destinationItem);

                    successAudio.play();
                    InventoryLog('Merging Stack Of ' + originItem.label + ' In ' + origin.data('invOwner') + ' Slot ' + originItem.slot + ' To ' + destination.parent().data('invOwner') + ' Slot' + destinationItem.slot);
                    $.post("http://disc-inventoryhud/CombineStack", JSON.stringify({
                        originOwner: origin.parent().data('invOwner'),
                        originSlot: origin.data('slot'),
                        originTier: origin.parent().data('invTier'),
                        originItem: originItem,
                        originQty: originItem.qty,
                        destinationOwner: destination.parent().data('invOwner'),
                        destinationSlot: destinationItem.slot,
                        destinationQty: destinationItem.qty,
                        destinationTier: destination.parent().data('invTier'),
                        destinationItem: destinationItem,
                    }));
                } else if (destinationItem.qty < destinationItem.max) {
                    var newOrigQty = destinationItem.max - destinationItem.qty;
                    originItem.qty -= newOrigQty;
                    AddItemToSlot(origin, originItem);
                    destinationItem.qty = destinationItem.max;
                    AddItemToSlot(destination, destinationItem);

                    successAudio.play();

                    InventoryLog('Adding ' + originItem.label + ' To Existing Stack In Inventory ' + destination.parent().data('invOwner') + ' Slot ' + destinationItem.slot);
                    $.post("http://disc-inventoryhud/TopoffStack", JSON.stringify({
                        originOwner: origin.parent().data('invOwner'),
                        originItem: origin.find('.item').data('item'),
                        originSlot: originItem.slot,
                        originTier: origin.parent().data('invTier'),
                        destinationOwner: destination.parent().data('invOwner'),
                        destinationItem: destination.find('.item').data('item'),
                        destinationSlot: destinationItem.slot,
                        destinationTier: destination.parent().data('invTier'),
                    }));
                } else {
                    DisplayMoveError(origin, destination, "Stack At Max Items");
                }
            }

        } else {
            destinationItem.slot = origin.data('slot')
            originItem.slot = destination.data('slot');

            ResetSlotToEmpty(origin);
            AddItemToSlot(origin, destinationItem);
            ResetSlotToEmpty(destination);
            AddItemToSlot(destination, originItem);
            successAudio.play();

            InventoryLog('Swapping ' + originItem.label + ' In ' + destination.parent().data('invOwner') + ' Slot ' + originItem.slot + ' With ' + destinationItem.label + ' In ' + origin.data('invOwner') + ' Slot ' + destinationItem.slot);
            //InventoryLog("SwapItems2 : Origin: " + origin.data('invOwner') + " Origin Slot: " + origin.data('slot') + " Destination: " + destination.parent().data('invOwner') + " Destination Slot: " + destination.data('slot'));
            $.post("http://disc-inventoryhud/SwapItems", JSON.stringify({
                originOwner: origin.parent().data('invOwner'),
                originItem: origin.find('.item').data('item'),
                originSlot: origin.data('slot'),
                originTier: origin.parent().data('invTier'),
                destinationOwner: destination.parent().data('invOwner'),
                destinationItem: destination.find('.item').data('item'),
                destinationSlot: destination.data('slot'),
                destinationTier: destination.parent().data('invTier'),
            }));
        }

        let originInv = origin.parent().data('invOwner');
        let destInv = destination.parent().data('invOwner');
    } else {
        failAudio.play();
        if (result === 1) {
            origin.addClass('error');
            setTimeout(function () {
                origin.removeClass('error');
            }, 1000);
            destination.addClass('error');
            setTimeout(function () {
                destination.removeClass('error');
            }, 1000);
            InventoryLog("Destination Inventory Owner Was Undefined");
        }
    }
}

function ErrorCheck(origin, destination, moveQty) {
    var originOwner = origin.parent().data('invOwner');
    var destinationOwner = destination.parent().data('invOwner');

    if (destinationOwner === undefined) {
        return 1
    }

    var sameInventory = (originOwner === destinationOwner);
    var status = -1;

    if (sameInventory) {
    } else if (originOwner === $('#inventoryOne').data('invOwner') && destinationOwner === $('#inventoryTwo').data('invOwner')) {
        var item = origin.find('.item').data('item');
    } else {
        var item = origin.find('.item').data('item');
    }

    return status
}

function ResetSlotToEmpty(slot) {
    slot.find('.item').addClass('empty-item');
    slot.find('.item').css('background-image', 'none');
    slot.find('.item-count').html(" ");
    slot.find('.item-name').html(" ");
    slot.find('.item').removeData("item");
}

function AddItemToSlot(slot, data) {
    slot.find('.empty-item').removeClass('empty-item');
    slot.find('.item').css('background-image', 'url(\'img/items/' + data.itemId + '.png\')');
    if (data.price !== undefined && data.price !== 0) {
        slot.find('.item-price').html('$' + data.price);
    }
    slot.find('.item-count').html(data.qty);
    slot.find('.item-name').html(data.label);
    slot.find('.item').data('item', data);
}

$.widget('ui.dialog', $.ui.dialog, {
    options: {
        // Determine if clicking outside the dialog shall close it
        clickOutside: false,
        // Element (id or class) that triggers the dialog opening 
        clickOutsideTrigger: ''
    },
    open: function () {
        var clickOutsideTriggerEl = $(this.options.clickOutsideTrigger),
            that = this;
        if (this.options.clickOutside) {
            // Add document wide click handler for the current dialog namespace
            $(document).on('click.ui.dialogClickOutside' + that.eventNamespace, function (event) {
                var $target = $(event.target);
                if ($target.closest($(clickOutsideTriggerEl)).length === 0 &&
                    $target.closest($(that.uiDialog)).length === 0) {
                    that.close();
                }
            });
        }
        // Invoke parent open method
        this._super();
    },
    close: function () {
        // Remove document wide click handler for the current dialog
        $(document).off('click.ui.dialogClickOutside' + this.eventNamespace);
        // Invoke parent close method 
        this._super();
    },
});

function ClearLog() {
    $('.inv-log').html('');
}

function InventoryLog(log) {
    $('.inv-log').html(log + "<br>" + $('.inv-log').html());
}

function DisplayMoveError(origin, destination, error) {
    failAudio.play();
    origin.addClass('error');
    destination.addClass('error');
    if (errorHighlightTimer != null) {
        clearTimeout(errorHighlightTimer);
    }
    errorHighlightTimer = setTimeout(function () {
        origin.removeClass('error');
        destination.removeClass('error');
    }, 1000);

    InventoryLog(error);
}