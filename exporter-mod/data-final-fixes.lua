-- log(serpent.block(data.raw, {comment = true, refcomment = true, tablecomment = false}))
require('json')


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

local function clonePure(obj)
	local kind = kind_of(obj)
	if (kind == 'array') then
		local o = {['_isArray'] = true,length=#obj}
		for i,v in ipairs(obj) do
			o[''..(i-1)] = clonePure(v)
		end
		return o
	end
	if (kind == 'table') then
		local o = {}
		for k,v in pairs(obj) do
			o[''..k] = clonePure(v)
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



log('exported data.raw:\n\n\n'..serpent.block(clonePure(data.raw))..'\n\n\n')
-- log(json.stringify(data.raw))


