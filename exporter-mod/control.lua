require('json')

require('types')


local baseLimit = 0
local limit = 0

dataTypes = dataTypes

for n1,t1 in pairs(dataTypes) do
	if t1._proto then
		local t2 = dataTypes[t1._proto]
		for k2,v2 in pairs(t2) do
			if t1[k2] == nil then
				t1[k2] = v2
			end
		end
	end
end

function shallowcopy(orig)
    local orig_type = type(orig)
    local copy
    if orig_type == 'table' then
        copy = {}
        for orig_key, orig_value in pairs(orig) do
            copy[orig_key] = orig_value
        end
    else -- number, string, boolean, etc
        copy = orig
    end
    return copy
end

local cached = {}

function cloneRecord(obj, vtype, depth)
	if cached[obj] ~= nil then return cached[obj] end
	local copy = {}
	cached[obj] = copy
	for k,v in pairs(obj) do
		if type(k)=='number' then k = '_'..k end
		copy[k] = clone(v, vtype, depth - 1)
	end
	return copy
end
function cloneArray(obj, vtype, depth)
	if cached[obj] ~= nil then return cached[obj] end
	local copy = {['_isArray'] = true,length=#obj}
	cached[obj] = copy
	for k,v in pairs(obj) do
		copy[''..(k-1)] = clone(v, vtype, depth - 1)
	end
	return copy
end

local function kind_of(obj)
  if type(obj) ~= 'table' then return type(obj) end
  local i = 1
  for k, v in pairs(obj) do
    if type(k) == 'string' then return 'table' end
    if obj[i] ~= nil then i = i + 1 else return 'table' end
  end
  -- fix for empty arrays:
  if i == 1 then return 'array' else return 'array' end
  -- if i == 1 then return 'table' else return 'array' end
end

function cloneFunctionArgument(arg)
	if (arg.type == 'variable') then return 'var("'..arg.variable_name..'")' end
	if (arg.type == 'literal-number') then return arg.literal_value end
	if (arg.type == 'function-application') then return cloneFunctionApplication(arg) end
	if (arg.type == 'procedure-delimiter') then return cloneFunctionDelemiter(arg) end

	error(arg.type)
end

function cloneFunctionDelemiter(fa)
	local fn = {
		['type']      = 'function-application',
		arguments     = {fa.expression},
		function_name = fa.type,
	}
	return cloneFunctionApplication(fn)
end

function cloneFunctionApplication(fa, depth)
	local args = fa.arguments
	local fn = fa.function_name
	-- if (not fn) and (fa.type ~= 'function-application') then fn = fa.type end
	local s = fn..'('
	local delim = ''
	for i,v in ipairs(args) do
		s = s .. delim .. cloneFunctionArgument(v)
		delim = ','
	end
	s = s .. ')'
	return s
end

function clonePure(obj, depth)
	if depth == 0 then return '[depth-limit]' end
	limit = limit - 1
	if limit <= 0 then limit = 0 return '[count-limit]' end

	local kind = kind_of(obj)
	if (kind == 'array') then
		local o = {['_isArray'] = true,length=#obj}
		for i,v in ipairs(obj) do
			o[''..(i-1)] = clonePure(v, depth - 1)
		end
		return o
	end
	if (kind == 'table') then
		local run, val= pcall(get, obj, 'type') 
		if val == 'function-application' then return cloneFunctionApplication(obj, depth) end
		local o = {}
		for k,v in pairs(obj) do
			o[k] = clonePure(v, depth - 1)
		end
		return o
	end
	if (kind == 'userdata') then
		return "USERDATA"
	end
	if (kind == 'number') then
	    if obj == 1/0 then return 1e99 end -- Infinity
	    if obj == -1/0 then return -1e99 end -- NegativeInfinity
	    if obj ~= obj then return nil end -- NaN
		return obj
	end
	return obj
end

local linkData = {
	force = true,
	object_name = true,
	name = true,
	index = true,
	type = true
}

local ignoreData = {
	_type = true,
	_proto = true,
	_req = true,
	valid = true,
	valid_for_read = true,

	-- zoom = true,
	-- map_view_settings = true,
	-- logistic_parameters = true,
	-- movement_bonus = true,

	-- remove_unfiltered_items = true,
	-- infinity_inventory_filters = true,
	-- vehicle_logistic_requests_enabled = true,

	-- map_view_settings = true,
	-- named_noise_expressions = true,
	-- probability_expression = true,

	undefined = true
}

dataTypes.LuaEquipmentPrototype._req.movement_bonus = {
	prop = 'type',
	value = 'movement-bonus-equipment',
}
if not dataTypes.LuaPlayer._req then dataTypes.LuaPlayer._req = {} end
dataTypes.LuaPlayer._req.remove_unfiltered_items = {
	prop = 'controller_type',
	value = defines.controllers.editor,
}
dataTypes.LuaPlayer._req.infinity_inventory_filters = {
	prop = 'controller_type',
	value = defines.controllers.editor,
}
dataTypes.LuaPlayer._req.vehicle_logistic_requests_enabled = {
	prop = 'vehicle_logistic_requests_enabled',
	exists = true,
}
dataTypes.LuaPlayer._req.zoom = {
	prop = 'zoom',
	exists = true,
}
dataTypes.LuaPlayer._req.map_view_settings = {
	prop = 'map_view_settings',
	exists = true,
}

dataTypes.LuaEntityPrototype["fluidbox_prototypes"] = "LuaFluidBoxPrototype[]"
dataTypes.LuaEntityPrototype["burner_prototype"] = "LuaBurnerPrototype"
dataTypes.LuaEntityPrototype["electric_energy_source_prototype"] = "LuaElectricEnergySourcePrototype"
dataTypes.LuaEntityPrototype["heat_energy_source_prototype"] = "LuaHeatEnergySourcePrototype"
dataTypes.LuaEntityPrototype["fluid_energy_source_prototype"] = "LuaFluidEnergySourcePrototype"
dataTypes.LuaEntityPrototype["void_energy_source_prototype"] = "LuaVoidEnergySourcePrototype"
dataTypes.LuaEquipmentPrototype["burner_prototype"] = "LuaBurnerPrototype"

function cloneLuaLink(obj, vtype, depth)
	local desc = dataTypes[vtype]
	if (desc == nil) then return {_type = '^'..vtype, obj = obj} end

	local valid = ((desc.valid == nil) or obj.valid) and ((desc.valid_for_read == nil) or obj.valid_for_read)

	if not valid then return nil end

	local copy = {_type = '^' .. vtype}

	for k,v in pairs(desc) do
		if linkData[k] and desc[k] then
	    	copy[k] = clone(obj[k], v, depth - 1)
	    end
    end

    return copy
end

function get(obj, key)
	local v = obj[key]
	return v
end
function objHas(obj, vtype, key, safe)
	local run, err = pcall(get, obj, key)
	if safe then return run end
	local trun, objtype = pcall(get, obj, 'type')
	if not trun then
		trun, objtype = pcall(get, obj, 'controller_type')
	end
	if not trun then objtype = 'none' end
	if not run then error(vtype..'.'..key..'['..objtype..']: '..err) end
end

function cloneLuaObject(obj, vtype, depth)
	-- if cached[obj] ~= nil then return cached[obj] end
	local desc = dataTypes[vtype]

	if (desc == nil) then return clonePure(obj, depth) end
	-- if (desc == nil) then return { _type = vtype, obj = obj} end

	local copy = {_type = desc._type}
	cached[obj] = copy

	local valid = ((desc.valid == nil) or obj.valid) and ((desc.valid_for_read == nil) or obj.valid_for_read)

	if not valid then
		cached[copy] = nil
		return nil
	end

	for k,v in pairs(desc) do
		local ignore = false
		-- if k:sub(1,1) == '_' then ignore = true end
		if ignoreData[k] then ignore = true end
		if (desc._req and desc._req[k]) then
			if desc._req[k].exists and not objHas(obj, nil, desc._req[k].prop, true) then
				ignore = true
			elseif obj[desc._req[k].prop] ~= desc._req[k].val then
				ignore = true
			elseif obj[desc._req[k].prop] == desc._req[k].badval then
				ignore = true
			end
		end

		if not ignore then
			objHas(obj, vtype, k)
	    	copy[k] = clone(obj[k], v, depth - 1)
			if v == 'LocalisedString' then
				-- queueTranslation(obj[k], copy, k)
		    end
		end
    end
	    
    return copy
end

function cloneDefinition(obj, vtype, depth)
	return obj
end

-- local tlRequestCount = 0
-- local tlRequests = {}
-- local tlUnqueued = {}

-- function queueTranslation(str, copy, key)
-- 	if str == nil then return end
-- 	local success = game.players[1].request_translation(str)
-- 	if success then
-- 		tlRequests[str] = {str = str, copy = copy, key = key}
-- 		tlRequestCount = tlRequestCount + 1
-- 	else
-- 		tlUnqueued[str] = {str = str, copy = copy, key = key}
-- 	end
-- end

-- script.on_event(defines.events.on_tick, function(event)
-- 	tlRequestCount = tlRequestCount - 1
-- 	local request = tlRequests[event.localised_string]
-- 	request.copy[request.key] = event.result
-- 	game.print(tlRequestCount)
-- end)


function clone(obj, vtype, depth)
	if limit < 0 then return '[count-limit]' end
	limit = limit - 1
	if (obj == nil) then
		return obj
	end
	if (depth <= 0) then
		error('too deep' .. vtype)
		return '[depth-limit('..vatype..')]'
	end
	if (type(obj) ~= 'table') then
		return cloneDefinition(obj)
	end
	if (vtype:sub(-2) == '[]') then
		return cloneArray(obj, vtype:sub(1, -3), depth)
	end
	if (vtype:sub(-2) == '{}') then
		return cloneRecord(obj, vtype:sub(1, -3), depth)
	end
	if (vtype:sub(1, 1) == '^') then
		return cloneLuaLink(obj, vtype:sub(2), depth)
	end
	return cloneLuaObject(obj, vtype, depth)
end

local once = not false

-- test = clone(game.map_gen_presets, "MapGenPreset{}")

baseLimit = 9999999
limit = baseLimit


commands.add_command('exportGameData', 'Exports the WHOLE game data. This will research_all_technologies of neutral force.', function()
	game.forces.neutral.research_all_technologies()
	limit = baseLimit
	local gameCopy = clone(game, "LuaGameScript", 19)
	local gameText = serpent.block(gameCopy) --json.stringify(gameCopy)
	game.write_file("game.lua", gameText)
	game.print("Export successfull")
	game.print("objects: "..((baseLimit - limit)/1000)..'k')
	if limit <= 0 then game.print('too many items, please incrase item limit') end
	game.print("game.lua size: "..(#gameText/1024/1024).." MB")
end)

